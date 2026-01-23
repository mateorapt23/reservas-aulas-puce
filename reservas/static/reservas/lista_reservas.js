// lista_reservas.js

document.addEventListener('DOMContentLoaded', function () {
    const tablaContainer = document.getElementById('tabla-container');
    const btnEliminarSeleccionadas = document.getElementById('btn-eliminar-seleccionadas');
    let editingRow = null;

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
            initAllEvents();
        })
        .catch(err => {
            console.error('Error recargando tabla:', err);
            tablaContainer.innerHTML = '<p class="text-red-500 text-center py-6">Error al cargar las reservas</p>';
        });
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

    // 1. Ordenamiento por columnas
    function initOrdenamiento() {
        document.querySelectorAll('.order-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const url = link.href;
                fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                    .then(r => r.text())
                    .then(html => {
                        tablaContainer.innerHTML = html;
                        initAllEvents();
                    })
                    .catch(err => console.error(err));
            });
        });
    }

    // 2. Búsqueda en tiempo real (debounce)
    function initBusqueda() {
        const buscador = document.getElementById('buscador');
        if (!buscador) return;

        let timeout;
        buscador.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                params.set('q', buscador.value.trim());
                const url = window.APP_URLS.listaReservas + '?' + params.toString();
                
                fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                    .then(r => r.text())
                    .then(html => {
                        tablaContainer.innerHTML = html;
                        initAllEvents();
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
                updateBotonEliminar();
            });
        }

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (!cb.checked) selectAll.checked = false;
                updateBotonEliminar();
            });
        });

        if (btnEliminarSeleccionadas) {
            btnEliminarSeleccionadas.addEventListener('click', eliminarSeleccionadas);
        }
    }

    function updateBotonEliminar() {
        const checkedCount = document.querySelectorAll('.select-row:checked').length;
        btnEliminarSeleccionadas.disabled = checkedCount === 0;
        btnEliminarSeleccionadas.textContent = checkedCount > 0 ? `Eliminar (${checkedCount})` : 'Eliminar seleccionadas';
    }

    function eliminarSeleccionadas() {
        const ids = Array.from(document.querySelectorAll('.select-row:checked'))
                        .map(cb => cb.closest('tr').dataset.id);

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

                if (document.querySelectorAll('.select-row:checked').length > 1) {
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
                html = `<input type="date" value="${value}" class="input input-xs bg-base-300 w-full">`;
            } else if (field === 'hora_inicio' || field === 'hora_fin') {
                html = `<input type="text" value="${value}" readonly class="input input-xs bg-base-300 w-full cursor-pointer time-input-edit">`;
     
            } else if (field === 'catedra') {
                let opts = window.APP_DATA.catedras.map(c => 
                    `<option value="${c.id}" ${c.id == td.dataset.id ? 'selected' : ''}>${c.nombre}</option>`
                ).join('');
                html = `<select class="select select-xs bg-base-300 w-full">${opts}</select>`;
            } else if (field === 'aula') {
                let opts = window.APP_DATA.aulas.map(a => 
                    `<option value="${a.id}" ${a.id == td.dataset.id ? 'selected' : ''}>Aula ${a.numero}</option>`
                ).join('');
                html = `<select class="select select-xs bg-base-300 w-full">${opts}</select>`;
            } else {
                html = `<input type="text" value="${value}" class="input input-xs bg-base-300 w-full">`;
            }
            td.innerHTML = html;
        });

        const acciones = tr.lastElementChild;
        acciones.innerHTML = `
            <button class="btn-guardar btn btn-xs btn-success btn-outline">Guardar</button>
            <button class="btn-cancelar btn btn-xs btn-warning btn-outline">Cancelar</button>
        `;

        acciones.querySelector('.btn-guardar').onclick = () => guardarFila(tr);
        acciones.querySelector('.btn-cancelar').onclick = () => cancelarEdicion(tr);
    }

    // ──────────────────────────────
    // Time Picker Global (fixed, sin scroll)
    // ──────────────────────────────
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
        .then(r => {
            if (!r.ok) {
                // Lee el JSON de error en respuestas como 400
                return r.json().then(errData => {
                    throw errData;  // Lanza el objeto JSON para procesarlo en el siguiente then
                });
            }
            return r.json();
        })
        .then(data => {
            if (data.success) {
                recargarTabla();
            } else {
                // Muestra el message del servidor (ej: "Choque de horario...")
                alert(data.message || 'Error al guardar los cambios');
                cancelarEdicion(tr);
            }
        })
        .catch(err => {
            // Solo para errores reales (red/conexión), no para 400
            console.error('Error completo:', err);
            alert(err.message || 'Error inesperado al guardar');
            cancelarEdicion(tr);
        });
    }

    function cancelarEdicion(tr) {
        editingRow = null;
        recargarTabla();
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
        .then(r => r.json().then(data => ({ok: r.ok, data})))  // Lee JSON siempre, guarda si fue ok o no
        .then(({ok, data}) => {
            if (ok && data.success) {
                recargarTabla();
            } else {
                // Muestra el message real del servidor
                alert(data.message || 'Error al guardar los cambios');
                cancelarEdicion(tr);
            }
        })
        .catch(err => {
            // Solo para errores de red/JSON inválido
            console.error('Error completo:', err);
            alert('Error inesperado al guardar: ' + (err.message || 'desconocido'));
            cancelarEdicion(tr);
        });
    }

    function cancelarEdicion(tr) {
        editingRow = null;
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
    function initTimePickersGlobal() {
    const picker = document.getElementById('global-time-picker');
    if (!picker) return;

    // Crear el contenido del picker solo una vez
    if (!picker.dataset.initialized) {
        crearContenidoTimePicker(picker);
        picker.dataset.initialized = 'true';
    }

    // Listener en delegación (porque la tabla se recarga)
    document.addEventListener('focus', e => {
        const input = e.target;
        if (!input.matches('.time-input-edit')) return;

        posicionarPickerDebajoDe(input, picker);
        abrirPicker(input, picker);
    }, true);

    // Cerrar al clic fuera
    document.addEventListener('click', e => {
        if (picker.classList.contains('hidden')) return;
        if (!picker.contains(e.target) && !e.target.matches('.time-input-edit')) {
            picker.classList.add('hidden');
            picker.style.display = 'none';
        }
    }, true);
}

function crearContenidoTimePicker(picker) {
    picker.innerHTML = `
        <div class="time-column" id="global-horas"></div>
        <div class="time-column" id="global-minutos"></div>
    `;

    const colHoras = picker.querySelector('#global-horas');
    const colMinutos = picker.querySelector('#global-minutos');

    const horas = [];
    for (let h = 7; h <= 21; h++) horas.push(h.toString().padStart(2, '0'));

    horas.forEach(h => {
        const div = document.createElement('div');
        div.className = 'time-option';
        div.textContent = h;
        div.onclick = () => seleccionarHora(h, picker);
        colHoras.appendChild(div);
    });

    ['00', '30'].forEach(m => {
        const div = document.createElement('div');
        div.className = 'time-option';
        div.textContent = m;
        div.onclick = () => seleccionarMinuto(m, picker);
        colMinutos.appendChild(div);
    });
}

let inputActual = null;

function seleccionarHora(h, picker) {
    if (!inputActual) return;
    inputActual.dataset.hora = h;
    intentarCompletar(inputActual, picker);
}

function seleccionarMinuto(m, picker) {
    if (!inputActual) return;
    inputActual.dataset.minuto = m;
    intentarCompletar(inputActual, picker);
}

function intentarCompletar(input, picker) {
    const h = input.dataset.hora;
    const m = input.dataset.minuto;
    if (h && m) {
        input.value = `${h}:${m}`;
        picker.classList.add('hidden');
        picker.style.display = 'none';
        input.blur();
        input.dataset.hora = '';
        input.dataset.minuto = '';
        inputActual = null;
    }
}

function posicionarPickerDebajoDe(input, picker) {
    const rect = input.getBoundingClientRect();
    picker.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    picker.style.left = (rect.left + window.scrollX) + 'px';
    picker.style.width = rect.width + 'px';
}

    function abrirPicker(input, picker) {
        inputActual = input;
        // Limpiar selección anterior si existe
        picker.querySelectorAll('.time-option.selected')?.forEach(el => el.classList.remove('selected'));

        // Opcional: pre-seleccionar si hay valor
        const [hora, minuto] = input.value.split(':');
        if (hora && minuto) {
            const optHora = picker.querySelector(`.time-column:first-child .time-option[data-value="${hora}"]`);
            const optMin = picker.querySelector(`.time-column:last-child .time-option[data-value="${minuto}"]`);
            if (optHora) optHora.classList.add('selected');
            if (optMin) optMin.classList.add('selected');
        }

        picker.classList.remove('hidden');
        picker.style.display = 'grid';
    }

    // Iniciar
    initAllEvents();
});