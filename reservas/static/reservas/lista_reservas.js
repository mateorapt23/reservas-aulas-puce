// lista_reservas.js

document.addEventListener('DOMContentLoaded', function () {
    const tablaContainer = document.getElementById('tabla-container');
    let editingRow = null;
    let seleccionados = new Set();
    let gruposExpandidos = new Set();
    
    // 🔥 Variables para evitar listeners duplicados
    let buscadorInitialized = false;
    let filtroSemanaInitialized = false;

    // 🔥 NUEVO: Función para auto-edición cuando se viene desde el drawer
    function autoEditarReserva() {
        const urlParams = new URLSearchParams(window.location.search);
        const reservaId = urlParams.get('reserva_id');
        const shouldEdit = urlParams.get('edit') === 'true';
        
        if (!reservaId || !shouldEdit) return;
        
        // Esperar un momento para que la tabla se cargue completamente
        setTimeout(() => {
            const tipoActual = urlParams.get('tipo');
            
            if (tipoActual === 'semestral') {
                // Buscar el grupo padre
                const grupoPadre = document.querySelector(`tr.grupo-padre[data-grupo-id="${reservaId}"]`);
                
                if (grupoPadre) {
                    // Expandir el grupo si está colapsado
                    if (grupoPadre.dataset.expanded !== 'true') {
                        const expandBtn = grupoPadre.querySelector('.expand-btn');
                        if (expandBtn) {
                            expandBtn.click();
                        }
                    }
                    
                    // Scroll hacia la fila
                    grupoPadre.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Esperar un momento y activar edición
                    setTimeout(() => {
                        editarGrupo(grupoPadre);
                        
                        // Limpiar parámetros de URL sin recargar
                        urlParams.delete('edit');
                        const newUrl = window.location.pathname + '?' + urlParams.toString();
                        window.history.replaceState({}, '', newUrl);
                    }, 500);
                }
            } else if (tipoActual === 'ocasional') {
                // Buscar la fila individual
                const fila = document.querySelector(`tr[data-id="${reservaId}"]`);
                
                if (fila) {
                    // Scroll hacia la fila
                    fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Esperar un momento y activar edición
                    setTimeout(() => {
                        editarFila(fila);
                        
                        // Limpiar parámetros de URL sin recargar
                        urlParams.delete('edit');
                        const newUrl = window.location.pathname + '?' + urlParams.toString();
                        window.history.replaceState({}, '', newUrl);
                    }, 500);
                }
            }
        }, 300);
    }

    // 🔥 NUEVO: Funciones para filtro de semana
    function obtenerLunesDeLaSemana(fechaStr) {
        const [año, mes, dia] = fechaStr.split('-').map(Number);
        const fecha = new Date(año, mes - 1, dia);
        const diaSemana = fecha.getDay();
        const diasARetroceder = diaSemana === 0 ? 6 : diaSemana - 1;
        const lunes = new Date(fecha);
        lunes.setDate(fecha.getDate() - diasARetroceder);
        return lunes;
    }

    function formatearFecha(fecha) {
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const año = fecha.getFullYear();
        return `${dia}/${mes}/${año}`;
    }

    function initFiltroSemana() {
        // 🔥 Evitar inicializar múltiples veces
        if (filtroSemanaInitialized) return;
        filtroSemanaInitialized = true;

        const filtroSemana = document.getElementById('filtro-semana');
        const btnLimpiar = document.getElementById('btn-limpiar-semana');
        const infoSemana = document.getElementById('info-semana');
        const fechaInicioSpan = document.getElementById('fecha-inicio-semana');
        const fechaFinSpan = document.getElementById('fecha-fin-semana');

        if (!filtroSemana) return;

        // Si ya hay un valor en el filtro, mostrar info de semana
        if (filtroSemana.value) {
            const lunes = obtenerLunesDeLaSemana(filtroSemana.value);
            const sabado = new Date(lunes);
            sabado.setDate(lunes.getDate() + 5);

            fechaInicioSpan.textContent = formatearFecha(lunes);
            fechaFinSpan.textContent = formatearFecha(sabado);
            infoSemana.classList.remove('hidden');
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        // Evento al cambiar fecha
        filtroSemana.addEventListener('change', function() {
            if (this.value) {
                guardarSeleccion();
                const params = new URLSearchParams(window.location.search);
                params.set('semana', this.value);
                
                const url = window.APP_URLS.listaReservas + '?' + params.toString();
                window.history.replaceState({}, '', '?' + params.toString());
                
                fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                    .then(r => r.text())
                    .then(html => {
                        tablaContainer.innerHTML = html;
                        restaurarSeleccion();
                        restaurarEstadoExpansion();
                        initAllEvents();
                        updateBotonEliminar();
                        
                        const lunes = obtenerLunesDeLaSemana(this.value);
                        const sabado = new Date(lunes);
                        sabado.setDate(lunes.getDate() + 5);
                        
                        fechaInicioSpan.textContent = formatearFecha(lunes);
                        fechaFinSpan.textContent = formatearFecha(sabado);
                        infoSemana.classList.remove('hidden');
                        
                        lucide.createIcons();
                    })
                    .catch(err => console.error(err));
            }
        });

        // Botón limpiar filtro
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', function() {
                filtroSemana.value = '';
                const params = new URLSearchParams(window.location.search);
                params.delete('semana');
                
                window.location.href = window.APP_URLS.listaReservas + '?' + params.toString();
            });
        }
    }

    function recargarTabla() {
        guardarSeleccion();
        
        const url = window.location.href;
        fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(r => r.text())
        .then(html => {
            tablaContainer.innerHTML = html;
            restaurarSeleccion();
            restaurarEstadoExpansion();
            initAllEvents();
            updateBotonEliminar();
            
            lucide.createIcons();
        })
        .catch(err => console.error(err));
    }

    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));
        return cookieValue ? cookieValue.split('=')[1] : '';
    }

    function guardarSeleccion() {
        seleccionados.clear();
        document.querySelectorAll('.select-row:checked, .select-grupo:checked').forEach(cb => {
            const tr = cb.closest('tr');
            if (tr) {
                const id = tr.dataset.id || cb.dataset.grupoId;
                seleccionados.add(id);
                
                if (cb.classList.contains('select-grupo')) {
                    const grupoId = cb.dataset.grupoId;
                    const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);
                    hijos.forEach(hijo => seleccionados.add(hijo.dataset.id));
                }
            }
        });
    }

    function restaurarSeleccion() {
        document.querySelectorAll('.select-row, .select-grupo').forEach(cb => {
            const tr = cb.closest('tr');
            if (tr) {
                const id = tr.dataset.id || cb.dataset.grupoId;
                cb.checked = seleccionados.has(id);
            }
        });
        actualizarSelectAll();
    }

    function restaurarEstadoExpansion() {
        gruposExpandidos.forEach(grupoId => {
            const grupoPadre = document.querySelector(`tr.grupo-padre[data-grupo-id="${grupoId}"]`);
            if (grupoPadre) {
                const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);
                const icon = grupoPadre.querySelector('.expand-btn i');
                
                hijos.forEach(hijo => hijo.classList.remove('hidden'));
                if (icon) icon.style.transform = 'rotate(90deg)';
                grupoPadre.dataset.expanded = 'true';
            }
        });
    }

    function actualizarSelectAll() {
        const selectAll = document.getElementById('select-all');
        if (!selectAll) return;

        const checkboxes = document.querySelectorAll('.select-row, .select-grupo');
        const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);

        if (checkedBoxes.length === checkboxes.length && checkboxes.length > 0) {
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
        initGruposSemestrales();
        initFiltroSemana();
    }

    // 0. Funcionalidad para grupos semestrales expandibles
    function initGruposSemestrales() {
        // 🔥 MÉTODO SIMPLIFICADO: Usar delegación de eventos en lugar de clonar
        
        // Expandir/colapsar con el botón
        document.querySelectorAll('.expand-btn').forEach(btn => {
            // Marcar que ya tiene el listener
            if (!btn.dataset.hasListener) {
                btn.dataset.hasListener = 'true';
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const tr = this.closest('tr.grupo-padre');
                    if (!tr) return;
                    
                    const grupoId = tr.dataset.grupoId;
                    const isExpanded = tr.dataset.expanded === 'true';
                    const icon = this.querySelector('i');
                    const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);
                    
                    if (isExpanded) {
                        // Colapsar
                        hijos.forEach(hijo => hijo.classList.add('hidden'));
                        if (icon) icon.style.transform = 'rotate(0deg)';
                        tr.dataset.expanded = 'false';
                        gruposExpandidos.delete(grupoId);
                    } else {
                        // Expandir
                        hijos.forEach(hijo => hijo.classList.remove('hidden'));
                        if (icon) icon.style.transform = 'rotate(90deg)';
                        tr.dataset.expanded = 'true';
                        gruposExpandidos.add(grupoId);
                    }
                    
                    // Re-inicializar iconos
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                });
            }
        });

        // Click en toda la fila padre
        document.querySelectorAll('.grupo-padre').forEach(tr => {
            if (!tr.dataset.hasListener) {
                tr.dataset.hasListener = 'true';
                tr.addEventListener('click', function(e) {
                    // No expandir si se hace click en inputs, botones o celdas editables
                    if (e.target.closest('input, button, .editable-grupo')) return;
                    
                    const btn = this.querySelector('.expand-btn');
                    if (btn) {
                        btn.click();
                    }
                });
            }
        });

        // Botones de editar grupo
        document.querySelectorAll('.btn-editar-grupo').forEach(btn => {
            if (!btn.dataset.hasListener) {
                btn.dataset.hasListener = 'true';
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const tr = this.closest('tr');
                    editarGrupo(tr);
                });
            }
        });

        // Botones de eliminar grupo
        document.querySelectorAll('.btn-eliminar-grupo').forEach(btn => {
            if (!btn.dataset.hasListener) {
                btn.dataset.hasListener = 'true';
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const tr = this.closest('tr');
                    const grupoId = tr.dataset.grupoId;
                    eliminarGrupoCompleto(grupoId);
                });
            }
        });
        
        // Re-inicializar iconos de lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function editarGrupo(tr) {
        if (editingRow) {
            alert('Ya hay una edición en curso');
            return;
        }
        editingRow = tr;

        tr.querySelectorAll('.editable-grupo').forEach(td => {
            const field = td.dataset.field;
            let value = td.textContent.trim();
            let html = '';

            if (field === 'catedra') {
                const currentId = td.dataset.id;
                const opts = window.APP_DATA.catedras.map(c =>
                    `<option value="${c.id}" ${c.id == currentId ? 'selected' : ''}>${c.nombre}</option>`
                ).join('');
                html = `<select class="select select-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">${opts}</select>`;
            } else if (field === 'aula') {
                const currentId = td.dataset.id;
                const opts = window.APP_DATA.aulas.map(a =>
                    `<option value="${a.id}" ${a.id == currentId ? 'selected' : ''}>${a.numero}</option>`
                ).join('');
                html = `<select class="select select-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">${opts}</select>`;
            } else if (field === 'fecha_fin_semestre') {
                html = `<input type="date" value="${value}" class="input input-xs w-full" style="background-color: #1a1a1a !important; color: white !important; min-width: 120px;">`;
            } else if (field === 'hora_inicio' || field === 'hora_fin') {
                html = `<input type="text" value="${value}" class="input input-xs w-full time-input-edit" style="background-color: #1a1a1a !important; color: white !important; min-width: 70px;" readonly>`;
            } else {
                html = `<input type="text" value="${value}" class="input input-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">`;
            }
            td.innerHTML = html;
        });

        const acciones = tr.lastElementChild;
        acciones.innerHTML = `
            <button class="btn-guardar-grupo btn btn-xs btn-success btn-outline gap-1 hover:bg-green-500/10 transition-all">
                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                Guardar
            </button>
            <button class="btn-cancelar btn btn-xs btn-warning btn-outline gap-1 hover:bg-yellow-500/10 transition-all">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
                Cancelar
            </button>
        `;

        lucide.createIcons();

        acciones.querySelector('.btn-guardar-grupo').onclick = (e) => {
            e.stopPropagation();
            guardarGrupo(tr);
        };
        acciones.querySelector('.btn-cancelar').onclick = (e) => {
            e.stopPropagation();
            cancelarEdicion();
        };
    }

    function guardarGrupo(tr) {
        const grupoId = tr.dataset.grupoId;
        const formData = new FormData();

        tr.querySelectorAll('.editable-grupo').forEach(td => {
            const field = td.dataset.field;
            const input = td.querySelector('input, select');
            if (input) {
                formData.append(field, input.value.trim());
            }
        });

        formData.append('grupo_id', grupoId);

        fetch(window.APP_URLS.updateGrupoSemestral, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
        })
        .then(r => r.json().then(data => ({ok: r.ok, data})))
        .then(({ok, data}) => {
            if (ok && data.success) {
                editingRow = null;
                alert(data.message || 'Grupo actualizado correctamente');
                recargarTabla();
            } else {
                alert(data.message || 'Error al guardar los cambios');
                cancelarEdicion();
            }
        })
        .catch(err => {
            console.error('Error completo:', err);
            alert('Error de conexión');
            cancelarEdicion();
        });
    }

    function eliminarGrupoCompleto(grupoId) {
        if (!confirm('¿Seguro que deseas eliminar todo el grupo semestral?')) return;

        const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);
        const idsAEliminar = [grupoId];
        hijos.forEach(hijo => idsAEliminar.push(hijo.dataset.id));

        const formData = new FormData();
        idsAEliminar.forEach(id => formData.append('ids[]', id));

        fetch(window.APP_URLS.deleteReservas, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
        })
        .then(r => r.json().then(data => ({ok: r.ok, data})))
        .then(({ok, data}) => {
            if (ok && data.success) {
                alert(data.message || 'Grupo eliminado correctamente');
                recargarTabla();
            } else {
                alert(data.message || 'Error al eliminar');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error de conexión');
        });
    }

    // 1. Ordenamiento múltiple
    let ordenesActivos = [];

    function initOrdenamiento() {
        const params = new URLSearchParams(window.location.search);
        const orderStr = params.get('order');
        
        ordenesActivos = [];
        if (orderStr) {
            orderStr.split(',').forEach(fieldStr => {
                fieldStr = fieldStr.trim();
                if (fieldStr.startsWith('-')) {
                    ordenesActivos.push({field: fieldStr.substring(1), dir: 'desc'});
                } else {
                    ordenesActivos.push({field: fieldStr, dir: 'asc'});
                }
            });
        }
        
        actualizarIndicadoresVisuales();
        
        document.querySelectorAll('.order-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const field = btn.dataset.field;
                
                guardarSeleccion();
                
                const existeIdx = ordenesActivos.findIndex(o => o.field === field);
                
                if (existeIdx !== -1) {
                    const orden = ordenesActivos[existeIdx];
                    if (orden.dir === 'asc') {
                        orden.dir = 'desc';
                        ordenesActivos.splice(existeIdx, 1);
                        ordenesActivos.unshift(orden);
                    } else {
                        ordenesActivos.splice(existeIdx, 1);
                    }
                } else {
                    ordenesActivos.unshift({field, dir: 'asc'});
                }
                
                aplicarOrdenamiento();
            });
        });
    }
    
    function actualizarIndicadoresVisuales() {
        document.querySelectorAll('.order-btn').forEach(btn => {
            const field = btn.dataset.field;
            const indicator = btn.querySelector('.order-indicator');
            if (!indicator) return;
            
            const idx = ordenesActivos.findIndex(o => o.field === field);
            if (idx !== -1) {
                const orden = ordenesActivos[idx];
                const arrow = orden.dir === 'asc' ? '↑' : '↓';
                const priority = ordenesActivos.length > 1 ? ` ${idx+1}` : '';
                indicator.textContent = `${arrow}${priority}`;
                btn.classList.add('text-blue-400');
            } else {
                indicator.textContent = '';
                btn.classList.remove('text-blue-400');
            }
        });
    }
    
    function aplicarOrdenamiento() {
        const orderStr = ordenesActivos
            .map(o => (o.dir === 'desc' ? '-' : '') + o.field)
            .join(',');
        
        const params = new URLSearchParams(window.location.search);
        if (orderStr) {
            params.set('order', orderStr);
        } else {
            params.delete('order');
        }
        
        const url = window.APP_URLS.listaReservas + '?' + params.toString();
        window.history.replaceState({}, '', '?' + params.toString());
        
        fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(r => r.text())
        .then(html => {
            tablaContainer.innerHTML = html;
            restaurarSeleccion();
            restaurarEstadoExpansion();
            initAllEvents();
            updateBotonEliminar();
            
            lucide.createIcons();
        })
        .catch(err => console.error(err));
    }

    // 2. Búsqueda
    function initBusqueda() {
        if (buscadorInitialized) return;
        buscadorInitialized = true;

        const buscador = document.getElementById('buscador');
        if (!buscador) return;

        let timeout = null;
        buscador.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                guardarSeleccion();
                
                const params = new URLSearchParams(window.location.search);
                if (buscador.value.trim()) {
                    params.set('q', buscador.value.trim());
                } else {
                    params.delete('q');
                }

                const url = window.APP_URLS.listaReservas + '?' + params.toString();
                window.history.replaceState({}, '', '?' + params.toString());

                fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                })
                .then(r => r.text())
                .then(html => {
                    tablaContainer.innerHTML = html;
                    restaurarSeleccion();
                    restaurarEstadoExpansion();
                    initAllEvents();
                    updateBotonEliminar();
                    
                    lucide.createIcons();
                })
                .catch(err => console.error(err));
            }, 300);
        });
    }

    // 3. Checkboxes
    function initCheckboxes() {
        const selectAll = document.getElementById('select-all');
        if (selectAll) {
            selectAll.addEventListener('change', () => {
                const checked = selectAll.checked;
                document.querySelectorAll('.select-row, .select-grupo').forEach(cb => {
                    cb.checked = checked;
                    const tr = cb.closest('tr');
                    if (tr) {
                        const id = tr.dataset.id || cb.dataset.grupoId;
                        if (checked) {
                            seleccionados.add(id);
                            if (cb.classList.contains('select-grupo')) {
                                const hijos = document.querySelectorAll(`.grupo-hijo-${id}`);
                                hijos.forEach(hijo => seleccionados.add(hijo.dataset.id));
                            }
                        } else {
                            seleccionados.delete(id);
                            if (cb.classList.contains('select-grupo')) {
                                const hijos = document.querySelectorAll(`.grupo-hijo-${id}`);
                                hijos.forEach(hijo => seleccionados.delete(hijo.dataset.id));
                            }
                        }
                    }
                });
                updateBotonEliminar();
            });
        }

        document.querySelectorAll('.select-row').forEach(cb => {
            cb.addEventListener('change', () => {
                const tr = cb.closest('tr');
                const id = tr.dataset.id;
                if (cb.checked) {
                    seleccionados.add(id);
                } else {
                    seleccionados.delete(id);
                }
                actualizarSelectAll();
                updateBotonEliminar();
            });
        });

        document.querySelectorAll('.select-grupo').forEach(cb => {
            cb.addEventListener('change', () => {
                const grupoId = cb.dataset.grupoId;
                const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);
                const checked = cb.checked;

                if (checked) {
                    seleccionados.add(grupoId);
                    hijos.forEach(hijo => seleccionados.add(hijo.dataset.id));
                } else {
                    seleccionados.delete(grupoId);
                    hijos.forEach(hijo => seleccionados.delete(hijo.dataset.id));
                }
                actualizarSelectAll();
                updateBotonEliminar();
            });
        });
    }

    function updateBotonEliminar() {
        const btn = document.getElementById('btn-eliminar-seleccionadas');
        if (!btn) return;

        if (seleccionados.size > 0) {
            btn.disabled = false;
            btn.textContent = `Eliminar seleccionadas (${seleccionados.size})`;
        } else {
            btn.disabled = true;
            btn.textContent = 'Eliminar seleccionadas';
        }
    }

    const btnEliminar = document.getElementById('btn-eliminar-seleccionadas');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', () => {
            if (seleccionados.size === 0) return;
            if (!confirm(`¿Eliminar ${seleccionados.size} reserva(s)?`)) return;

            const formData = new FormData();
            seleccionados.forEach(id => formData.append('ids[]', id));

            fetch(window.APP_URLS.deleteReservas, {
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
            })
            .then(r => r.json().then(data => ({ok: r.ok, data})))
            .then(({ok, data}) => {
                if (ok && data.success) {
                    alert(data.message || 'Reservas eliminadas');
                    seleccionados.clear();
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
    }

    // 4. Edición inline
    function initEdicion() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                const tr = btn.closest('tr');
                editarFila(tr);
            });
        });
    }

    function editarFila(tr) {
        if (editingRow) {
            alert('Ya hay una edición en curso');
            return;
        }
        editingRow = tr;

        tr.querySelectorAll('.editable').forEach(td => {
            const field = td.dataset.field;
            let value = td.textContent.trim();
            let html = '';

            if (field === 'catedra') {
                const currentId = td.dataset.id;
                const opts = window.APP_DATA.catedras.map(c =>
                    `<option value="${c.id}" ${c.id == currentId ? 'selected' : ''}>${c.nombre}</option>`
                ).join('');
                html = `<select class="select select-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">${opts}</select>`;
            } else if (field === 'aula') {
                const currentId = td.dataset.id;
                const opts = window.APP_DATA.aulas.map(a =>
                    `<option value="${a.id}" ${a.id == currentId ? 'selected' : ''}>${a.numero}</option>`
                ).join('');
                html = `<select class="select select-xs w-full" style="background-color: #1a1a1a !important; color: white !important;">${opts}</select>`;
            } else if (field === 'fecha') {
                html = `<input type="date" value="${value}" class="input input-xs w-full" style="background-color: #1a1a1a !important; color: white !important; min-width: 120px;">`;
            } else if (field === 'hora_inicio' || field === 'hora_fin') {
                html = `<input type="text" value="${value}" class="input input-xs w-full time-input-edit" style="background-color: #1a1a1a !important; color: white !important; min-width: 70px;" readonly>`;
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

        lucide.createIcons();

        acciones.querySelector('.btn-guardar').onclick = () => guardarFila(tr);
        acciones.querySelector('.btn-cancelar').onclick = () => cancelarEdicion();
    }

    // Time Picker
    let pickerInputActivo = null;

    function initGlobalTimePicker() {
        const picker = document.getElementById('global-time-picker');
        if (!picker) return;

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

        tablaContainer.addEventListener('focusin', e => {
            if (e.target.classList.contains('time-input-edit')) {
                abrirPickerGlobal(e.target, picker);
            }
        });

        document.addEventListener('click', e => {
            if (picker.style.display !== 'grid') return;
            if (!picker.contains(e.target) && !e.target.classList.contains('time-input-edit')) {
                cerrarPickerGlobal(picker);
            }
        });

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
        cerrarPickerGlobal(picker);

        pickerInputActivo = input;

        const rect = input.getBoundingClientRect();
        const pickerHeight = 200;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        let top, positioning;
        if (spaceBelow >= pickerHeight || spaceBelow > spaceAbove) {
            top = rect.bottom + window.scrollY + 6;
            positioning = 'below';
        } else {
            top = rect.top + window.scrollY - pickerHeight - 6;
            positioning = 'above';
        }
        
        picker.style.top = top + 'px';
        picker.style.left = rect.left + window.scrollX + 'px';
        picker.style.width = Math.max(rect.width, 150) + 'px';
        picker.dataset.positioning = positioning;

        const [h, m] = input.value.split(':');
        picker.querySelectorAll('.time-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === h || opt.dataset.value === m);
        });

        picker.style.display = 'grid';
        
        setTimeout(() => {
            const pickerRect = picker.getBoundingClientRect();
            if (pickerRect.bottom > viewportHeight) {
                picker.style.top = (viewportHeight - pickerRect.height - 10 + window.scrollY) + 'px';
            }
            if (pickerRect.top < 0) {
                picker.style.top = '10px';
            }
        }, 0);
    }

    function cerrarPickerGlobal(picker) {
        picker.style.display = 'none';
        delete picker.dataset.horaTemp;
        pickerInputActivo = null;
    }

    function guardarFila(tr) {
        const id = tr.dataset.id;
        const formData = new FormData();

        tr.querySelectorAll('.editable').forEach(td => {
            const field = td.dataset.field;
            const input = td.querySelector('input, select');
            if (input) {
                formData.append('field', field);
                formData.append('value', input.value.trim());

                fetch(window.APP_URLS.updateReserva(id), {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
                })
                .then(r => r.json().then(data => ({ok: r.ok, data})))
                .then(({ok, data}) => {
                    if (!ok || !data.success) {
                        throw new Error(data.message || 'Error al guardar');
                    }
                })
                .catch(err => {
                    alert(err.message);
                    cancelarEdicion();
                    throw err;
                });
            }
        });

        setTimeout(() => {
            editingRow = null;
            alert('Reserva actualizada correctamente');
            recargarTabla();
        }, 200);
    }

    function cancelarEdicion() {
        if (!editingRow) return;
        editingRow = null;
        recargarTabla();
    }

    // 5. Eliminación individual
    function initEliminacionIndividual() {
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', () => {
                const tr = btn.closest('tr');
                const id = tr.dataset.id;

                if (!confirm('¿Eliminar esta reserva?')) return;

                const formData = new FormData();
                formData.append('ids[]', id);

                fetch(window.APP_URLS.deleteReservas, {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
                })
                .then(r => r.json().then(data => ({ok: r.ok, data})))
                .then(({ok, data}) => {
                    if (ok && data.success) {
                        alert(data.message || 'Reserva eliminada');
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

    // Inicializar todo
    initAllEvents();
    
    // 🔥 NUEVO: Ejecutar auto-edición si corresponde
    autoEditarReserva();
});