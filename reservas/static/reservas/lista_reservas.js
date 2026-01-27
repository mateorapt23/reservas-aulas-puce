// lista_reservas.js

document.addEventListener('DOMContentLoaded', function () {
    const tablaContainer = document.getElementById('tabla-container');
    const btnEliminarSeleccionadas = document.getElementById('btn-eliminar-seleccionadas');
    let editingRow = null;
    let seleccionados = new Set(); // 👈 CRÍTICO: Mantener selección entre búsquedas

    // Recargar tabla manteniendo filtros actuales
    function recargarTabla() {
        const url = window.APP_URLS.listaReservas + window.location.search;
        
        fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(r => {
            if (!r.ok) throw new Error('Error en servidor');
            return r.text();
        })
        .then(html => {
            tablaContainer.innerHTML = html;
            restaurarSeleccion(); // 👈 Restaurar checkboxes marcados
            initAllEvents();
            updateBotonEliminar(); // 👈 Actualizar contador
            
            // Re-inicializar iconos
            lucide.createIcons();
        })
        .catch(err => {
            console.error('Error recargando tabla:', err);
            tablaContainer.innerHTML = '<p class="text-red-500 text-center py-6">Error al cargar las reservas</p>';
        });
    }

    // 👇 FUNCIONES PARA MANTENER SELECCIÓN ENTRE BÚSQUEDAS
    function guardarSeleccion() {
        // NO limpiar el Set, solo actualizar basado en los checkboxes VISIBLES
        document.querySelectorAll('.select-row').forEach(cb => {
            const id = cb.closest('tr').dataset.id;
            if (cb.checked) {
                seleccionados.add(id); // Agregar si está marcado
            } else {
                seleccionados.delete(id); // Quitar si está desmarcado
            }
        });
    }

    function restaurarSeleccion() {
        document.querySelectorAll('.select-row').forEach(cb => {
            const id = cb.closest('tr').dataset.id;
            if (seleccionados.has(id)) {
                cb.checked = true;
            }
        });
        actualizarSelectAll();
    }

    function actualizarSelectAll() {
        const selectAll = document.getElementById('select-all');
        if (!selectAll) return;
        
        const checkboxes = document.querySelectorAll('.select-row');
        const checkedBoxes = document.querySelectorAll('.select-row:checked');
        
        if (checkboxes.length === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        } else if (checkedBoxes.length === checkboxes.length) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else if (checkedBoxes.length > 0) {
            selectAll.checked = false;
            selectAll.indeterminate = true;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }
    }

    // Inicializar todos los eventos después de cada carga
    function initAllEvents() {
        initOrdenamiento();
        initBusqueda();
        initCheckboxes();
        initEdicion();
        initEliminacionIndividual();
        initGlobalTimePicker();
    }

    // 1. Ordenamiento MÚLTIPLE por columnas
    let ordenesActivos = []; // [{field: 'docente', dir: 'asc'}, {field: 'fecha', dir: 'desc'}]
    
    function initOrdenamiento() {
        // Leer órdenes de la URL al cargar
        const params = new URLSearchParams(window.location.search);
        const orderParam = params.get('order');
        if (orderParam) {
            ordenesActivos = orderParam.split(',').map(o => {
                const dir = o.startsWith('-') ? 'desc' : 'asc';
                const field = o.replace(/^-/, '');
                return {field, dir};
            });
        }
        
        actualizarIndicadoresVisuales();
        
        document.querySelectorAll('.order-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const field = btn.dataset.field;
                
                guardarSeleccion(); // 👈 Guardar ANTES de ordenar
                
                // Buscar si ya existe este campo en los órdenes activos
                const existeIdx = ordenesActivos.findIndex(o => o.field === field);
                
                if (existeIdx !== -1) {
                    // Ya existe: cambiar dirección o quitar
                    const orden = ordenesActivos[existeIdx];
                    if (orden.dir === 'asc') {
                        // Cambiar a descendente y mover al principio (prioridad 1)
                        orden.dir = 'desc';
                        ordenesActivos.splice(existeIdx, 1);
                        ordenesActivos.unshift(orden);
                    } else {
                        // Quitar completamente
                        ordenesActivos.splice(existeIdx, 1);
                    }
                } else {
                    // No existe: agregar AL PRINCIPIO con dirección ascendente (prioridad 1)
                    ordenesActivos.unshift({field, dir: 'asc'});
                }
                
                aplicarOrdenamiento();
            });
        });
    }
    
    function aplicarOrdenamiento() {
        // Construir parámetro order: el PRIMERO del array tiene prioridad 1
        const orderString = ordenesActivos.map(o => 
            (o.dir === 'desc' ? '-' : '') + o.field
        ).join(',');
        
        const params = new URLSearchParams(window.location.search);
        
        if (orderString) {
            params.set('order', orderString);
        } else {
            params.delete('order');
        }
        
        const url = window.APP_URLS.listaReservas + '?' + params.toString();
        
        // Actualizar URL sin recargar página
        window.history.replaceState({}, '', '?' + params.toString());
        
        fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(r => r.text())
            .then(html => {
                tablaContainer.innerHTML = html;
                restaurarSeleccion(); // 👈 Restaurar DESPUÉS
                initAllEvents();
                updateBotonEliminar();
                actualizarIndicadoresVisuales();
                
                // Re-inicializar iconos
                lucide.createIcons();
            })
            .catch(err => console.error(err));
    }
    
    function actualizarIndicadoresVisuales() {
        // Limpiar todos los indicadores y estilos
        document.querySelectorAll('.order-btn').forEach(btn => {
            btn.classList.remove('text-blue-400');
        });
        document.querySelectorAll('.order-indicator').forEach(ind => {
            ind.innerHTML = '';
        });
        
        // Agregar indicadores para cada orden activo
        // El índice 0 es prioridad 1, índice 1 es prioridad 2, etc.
        ordenesActivos.forEach((orden, idx) => {
            const btn = document.querySelector(`.order-btn[data-field="${orden.field}"]`);
            if (!btn) return;
            
            const indicator = btn.querySelector('.order-indicator');
            const numero = idx + 1; // Prioridad visual: 1, 2, 3...
            
            // Agregar flecha y número
            indicator.innerHTML = `
                <i data-lucide="${orden.dir === 'asc' ? 'arrow-up' : 'arrow-down'}" class="w-3 h-3 text-blue-400"></i>
                ${ordenesActivos.length > 1 ? `<span class="text-[10px] text-blue-400 font-bold">${numero}</span>` : ''}
            `;
            
            // Resaltar el botón
            btn.classList.add('text-blue-400');
        });
        
        // Re-inicializar iconos de Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 2. Búsqueda en tiempo real (debounce)
    function initBusqueda() {
        const buscador = document.getElementById('buscador');
        if (!buscador) return;

        let timeout;
        buscador.addEventListener('input', () => {
            clearTimeout(timeout);
            guardarSeleccion(); // 👈 Guardar INMEDIATAMENTE antes de que desaparezcan los checkboxes
            timeout = setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                params.set('q', buscador.value.trim());
                const url = window.APP_URLS.listaReservas + '?' + params.toString();
                
                fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                    .then(r => r.text())
                    .then(html => {
                        tablaContainer.innerHTML = html;
                        restaurarSeleccion(); // 👈 Restaurar DESPUÉS
                        initAllEvents();
                        updateBotonEliminar();
                        
                        // Re-inicializar iconos
                        lucide.createIcons();
                    });
            }, 350);
        });
    }

    // 3. Checkboxes y botón de eliminación masiva
    function initCheckboxes() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.select-row');

        if (selectAll) {
            selectAll.addEventListener('change', () => {
                checkboxes.forEach(cb => cb.checked = selectAll.checked);
                guardarSeleccion(); // 👈 Guardar después de cambiar
                updateBotonEliminar();
            });
        }

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                guardarSeleccion(); // 👈 Guardar en cada cambio
                actualizarSelectAll();
                updateBotonEliminar();
            });
        });

        if (btnEliminarSeleccionadas) {
            btnEliminarSeleccionadas.addEventListener('click', eliminarSeleccionadas);
        }
    }

    function updateBotonEliminar() {
        const checkedCount = seleccionados.size; // 👈 Contar desde el Set, no del DOM
        btnEliminarSeleccionadas.disabled = checkedCount === 0;
        btnEliminarSeleccionadas.textContent = checkedCount > 0 ? `Eliminar (${checkedCount})` : 'Eliminar seleccionadas';
    }

    function eliminarSeleccionadas() {
        const ids = Array.from(seleccionados); // 👈 Usar el Set directamente

        if (ids.length === 0) return;
        if (!confirm(`¿Eliminar ${ids.length} reserva(s)?`)) return;

        const formData = new FormData();
        ids.forEach(id => formData.append('ids[]', id));

        fetch(window.APP_URLS.deleteReservas, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken()
            }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                seleccionados.clear(); // 👈 Limpiar selección después de eliminar
                recargarTabla();
            } else {
                alert(data.message || 'Error al eliminar reservas');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error de conexión al eliminar');
        });
    }

    // 4. Edición inline
    function initEdicion() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                const tr = btn.closest('tr');

                if (editingRow && editingRow !== tr) {
                    cancelarEdicion(editingRow);
                }

                // 👇 Verificar si hay múltiples seleccionados (usando el Set)
                if (seleccionados.size > 1) {
                    alert('No puedes editar mientras tienes varias filas seleccionadas.');
                    return;
                }

                editarFila(tr);
            });
        });
    }

    function editarFila(tr) {
        tr.querySelectorAll('.editable').forEach(td => {
            const field = td.dataset.field;
            if (field === 'tipo') return;
            
            const value = td.innerText.trim();
            let html = '';

            if (field === 'fecha') {
                html = `<input type="date" value="${value}" class="input input-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">`;
            } else if (field === 'hora_inicio' || field === 'hora_fin') {
                html = `<input type="text" value="${value}" readonly class="input input-xs w-full cursor-pointer time-input-edit" style="background-color: #1a1a1a !important; color: white !important;">`;
     
            } else if (field === 'catedra') {
                let opts = window.APP_DATA.catedras.map(c => 
                    `<option value="${c.id}" ${c.id == td.dataset.id ? 'selected' : ''}>${c.nombre}</option>`
                ).join('');
                html = `<select class="select select-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">${opts}</select>`;
            } else if (field === 'aula') {
                let opts = window.APP_DATA.aulas.map(a => 
                    `<option value="${a.id}" ${a.id == td.dataset.id ? 'selected' : ''}>Aula ${a.numero}</option>`
                ).join('');
                html = `<select class="select select-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">${opts}</select>`;
            } else {
                html = `<input type="text" value="${value}" class="input input-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">`;
            }
            td.innerHTML = html;
        });

        const acciones = tr.lastElementChild;
        acciones.innerHTML = `
            <button class="btn-guardar btn btn-xs btn-success btn-outline gap-1 hover:bg-green-500/10 transition-all">
                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                Guardar
            </button>
            <button class="btn-cancelar btn btn-xs btn-warning btn-outline gap-1 hover:bg-yellow-500/10 transition-all">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
                Cancelar
            </button>
        `;

        // Re-inicializar iconos
        lucide.createIcons();

        acciones.querySelector('.btn-guardar').onclick = () => guardarFila(tr);
        acciones.querySelector('.btn-cancelar').onclick = () => cancelarEdicion(tr);
    }

    // ────────────────────────────────────
    // Time Picker Global (fixed, sin scroll)
    // ────────────────────────────────────
    let pickerInputActivo = null;

    function initGlobalTimePicker() {
        const picker = document.getElementById('global-time-picker');
        if (!picker) return;

        // Inicializar solo una vez
        if (!picker.hasAttribute('data-init')) {
            picker.innerHTML = `
                <div class="time-column"></div>
                <div class="time-column"></div>
            `;
            const colH = picker.children[0];
            const colM = picker.children[1];

            for (let h = 7; h <= 21; h++) {
                let hh = h.toString().padStart(2,'0');
                let opt = document.createElement('div');
                opt.className = 'time-option';
                opt.textContent = hh;
                opt.dataset.value = hh;
                colH.appendChild(opt);
            }

            ['00','30'].forEach(m => {
                let opt = document.createElement('div');
                opt.className = 'time-option';
                opt.textContent = m;
                opt.dataset.value = m;
                colM.appendChild(opt);
            });

            picker.setAttribute('data-init', 'true');
        }

        // Delegación de focus (funciona aunque la tabla se recargue)
        tablaContainer.addEventListener('focusin', e => {
            if (e.target.classList.contains('time-input-edit')) {
                abrirPickerGlobal(e.target, picker);
            }
        });

        // Cierre al clic fuera
        document.addEventListener('click', e => {
            if (picker.style.display !== 'grid') return;
            if (!picker.contains(e.target) && !e.target.classList.contains('time-input-edit')) {
                cerrarPickerGlobal(picker);
            }
        });

        // Selección dentro del picker
        picker.addEventListener('click', e => {
            if (!e.target.classList.contains('time-option')) return;
            if (!pickerInputActivo) return;

            const isHora = e.target.parentElement === picker.children[0];
            const val = e.target.dataset.value;

            if (isHora) {
                picker.dataset.horaTemp = val;
            } else {
                const hora = picker.dataset.horaTemp || pickerInputActivo.value.split(':')[0];
                if (hora && val) {
                    pickerInputActivo.value = `${hora}:${val}`;
                    cerrarPickerGlobal(picker);
                }
            }
        });
    }

    function abrirPickerGlobal(input, picker) {
        cerrarPickerGlobal(picker); // cierra si había otro abierto

        pickerInputActivo = input;

        const rect = input.getBoundingClientRect();
        picker.style.top  = (rect.bottom + window.scrollY + 6) + 'px';
        picker.style.left = rect.left + window.scrollX + 'px';
        picker.style.width = rect.width + 'px';

        // Preseleccionar si hay valor
        const [h, m] = input.value.split(':');
        picker.querySelectorAll('.time-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === h || opt.dataset.value === m);
        });

        picker.style.display = 'grid';
    }

    function cerrarPickerGlobal(picker) {
        picker.style.display = 'none';
        pickerInputActivo = null;
        picker.removeAttribute('data-horaTemp');
    }

    function guardarFila(tr) {
        const id = tr.dataset.id;
        const formData = new FormData();

        tr.querySelectorAll('.editable').forEach(td => {
            const field = td.dataset.field;
            const input = td.querySelector('input, select');
            formData.append(field, input ? input.value.trim() : '');
        });

        fetch(window.APP_URLS.updateReserva(id), {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
        })
        .then(r => r.json().then(data => ({ok: r.ok, data})))
        .then(({ok, data}) => {
            if (ok && data.success) {
                recargarTabla();
            } else {
                alert(data.message || 'Error al guardar los cambios');
                cancelarEdicion(tr);
            }
        })
        .catch(err => {
            console.error('Error completo:', err);
            alert('Error inesperado al guardar: ' + (err.message || 'desconocido'));
            cancelarEdicion(tr);
        });
    }

    function cancelarEdicion(tr) {
        editingRow = null;
        guardarSeleccion(); // 👈 Guardar antes de recargar
        recargarTabla();
    }

    // 5. Eliminación individual
    function initEliminacionIndividual() {
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.closest('tr').dataset.id;
                if (!confirm('¿Eliminar esta reserva?')) return;

                const formData = new FormData();
                formData.append('ids[]', id);

                fetch(window.APP_URLS.deleteReservas, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken()
                    }
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        seleccionados.delete(id); // 👈 Quitar de seleccionados
                        recargarTabla();
                    } else {
                        alert(data.message || 'Error al eliminar');
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Error de conexión');
                });
            });
        });
    }

    // Helper: obtener CSRF de cookie
    function getCsrfToken() {
        const name = 'csrftoken';
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, val] = cookie.trim().split('=');
            if (key === name) return decodeURIComponent(val);
        }
        return '';
    }

    // Iniciar
    initAllEvents();
    updateBotonEliminar(); // 👈 Inicializar el botón al cargar
});