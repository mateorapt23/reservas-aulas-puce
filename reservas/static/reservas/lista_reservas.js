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
            if (!tr) return;
            
            const id = tr.dataset.id || cb.dataset.grupoId;
            if (seleccionados.has(id)) {
                cb.checked = true;
            }
        });
    }

    function guardarEstadoExpansion() {
        gruposExpandidos.clear();
        document.querySelectorAll('.grupo-padre[data-expanded="true"]').forEach(tr => {
            gruposExpandidos.add(tr.dataset.grupoId);
        });
    }

    function restaurarEstadoExpansion() {
        gruposExpandidos.forEach(grupoId => {
            const tr = document.querySelector(`.grupo-padre[data-grupo-id="${grupoId}"]`);
            if (tr) {
                const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);
                hijos.forEach(h => h.classList.remove('hidden'));
                tr.dataset.expanded = 'true';
                const icon = tr.querySelector('.expand-btn i');
                if (icon) icon.style.transform = 'rotate(90deg)';
            }
        });
    }

    function updateBotonEliminar() {
        const btnEliminarSeleccion = document.getElementById('btn-eliminar-seleccionadas');
        if (!btnEliminarSeleccion) return;

        const checkedBoxes = document.querySelectorAll('.select-row:checked, .select-grupo:checked');
        const count = checkedBoxes.length;

        if (count > 0) {
            btnEliminarSeleccion.disabled = false;
            btnEliminarSeleccion.classList.remove('btn-disabled');
            btnEliminarSeleccion.innerHTML = `Eliminar (${count})`;
        } else {
            btnEliminarSeleccion.disabled = true;
            btnEliminarSeleccion.classList.add('btn-disabled');
            btnEliminarSeleccion.innerHTML = `Eliminar seleccionadas`;
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function initAllEvents() {
        initSeleccionTodo();
        initSeleccionFila();
        initSeleccionGrupo();
        initExpandirGrupos();
        initEdicionInline();
        initEdicionGrupo();
        initEliminacionIndividual();
        initEliminacionGrupo();
        initBuscador();
        initOrdenamientoTabla();
        initFiltroSemana();
        initGlobalTimePicker();
    }

    // 1. Select All
    function initSeleccionTodo() {
        const selectAll = document.getElementById('select-all');
        if (!selectAll) return;

        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.select-row, .select-grupo');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                
                if (cb.classList.contains('select-grupo')) {
                    const grupoId = cb.dataset.grupoId;
                    const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId} .select-row`);
                    hijos.forEach(hijo => hijo.checked = this.checked);
                }
            });
            updateBotonEliminar();
        });
    }

    // 2. Select Fila
    function initSeleccionFila() {
        document.querySelectorAll('.select-row').forEach(cb => {
            cb.addEventListener('change', () => updateBotonEliminar());
        });
    }

    // 3. Select Grupo (semestral)
    function initSeleccionGrupo() {
        document.querySelectorAll('.select-grupo').forEach(cb => {
            cb.addEventListener('change', function() {
                const grupoId = this.dataset.grupoId;
                const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId} .select-row`);
                hijos.forEach(hijo => hijo.checked = this.checked);
                updateBotonEliminar();
            });
        });
    }

    // 4. Expandir/Colapsar grupos
    function initExpandirGrupos() {
        document.querySelectorAll('.grupo-padre').forEach(tr => {
            const grupoId = tr.dataset.grupoId;
            const expandBtn = tr.querySelector('.expand-btn');
            
            if (!expandBtn) return;

            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const expanded = tr.dataset.expanded === 'true';
                const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);
                const icon = expandBtn.querySelector('i');

                if (expanded) {
                    hijos.forEach(h => h.classList.add('hidden'));
                    tr.dataset.expanded = 'false';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    hijos.forEach(h => h.classList.remove('hidden'));
                    tr.dataset.expanded = 'true';
                    if (icon) icon.style.transform = 'rotate(90deg)';
                }
            });
        });
    }

    // Ordenamiento
    function initOrdenamientoTabla() {
        const orderButtons = document.querySelectorAll('.order-btn');
        
        orderButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const field = this.dataset.field;
                const params = new URLSearchParams(window.location.search);
                
                const currentOrder = params.get('order');
                const currentDir = params.get('dir') || 'asc';
                
                let newDir = 'asc';
                if (currentOrder === field) {
                    newDir = currentDir === 'asc' ? 'desc' : 'asc';
                }
                
                params.set('order', field);
                params.set('dir', newDir);
                
                guardarSeleccion();
                guardarEstadoExpansion();
                
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
            });
        });
    }

    // Buscador
    function initBuscador() {
        if (buscadorInitialized) return;
        buscadorInitialized = true;

        const buscador = document.getElementById('buscador');
        if (!buscador) return;

        buscador.addEventListener('input', function() {
            const texto = this.value.toLowerCase().trim();
            const params = new URLSearchParams(window.location.search);
            
            if (texto) {
                params.set('q', texto);
            } else {
                params.delete('q');
            }
            
            guardarSeleccion();
            guardarEstadoExpansion();
            
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
        });
    }

    // Eliminación masiva
    const btnEliminar = document.getElementById('btn-eliminar-seleccionadas');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', () => {
            const checks = document.querySelectorAll('.select-row:checked, .select-grupo:checked');
            if (checks.length === 0) {
                alert('No hay reservas seleccionadas');
                return;
            }

            const ids = [];
            checks.forEach(cb => {
                const tr = cb.closest('tr');
                if (cb.classList.contains('select-grupo')) {
                    const grupoId = cb.dataset.grupoId;
                    const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);
                    hijos.forEach(hijo => ids.push(hijo.dataset.id));
                } else {
                    ids.push(tr.dataset.id);
                }
            });

            if (!confirm(`¿Eliminar ${ids.length} reserva(s)?`)) return;

            const formData = new FormData();
            ids.forEach(id => formData.append('ids[]', id));

            fetch(window.APP_URLS.deleteReservas, {
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
            })
            .then(r => r.json().then(data => ({ok: r.ok, data})))
            .then(({ok, data}) => {
                if (ok && data.success) {
                    alert(data.message || 'Reservas eliminadas');
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

    // Edición GRUPOS SEMESTRALES
    function initEdicionGrupo() {
        document.querySelectorAll('.btn-editar-grupo').forEach(btn => {
            btn.addEventListener('click', () => {
                const tr = btn.closest('tr.grupo-padre');
                editarGrupo(tr);
            });
        });
    }

    function editarGrupo(tr) {
        if (editingRow && editingRow !== tr) {
            cancelarEdicion();
        }
        editingRow = tr;

        const grupoId = tr.dataset.grupoId;
        const requerimientosIds = JSON.parse(tr.dataset.requerimientos || '[]');

        // Obtener valores actuales
        let docente = '', catedraId = '', aulaId = '', fechaFin = '', horaInicio = '', horaFin = '';

        tr.querySelectorAll('.editable-grupo').forEach(td => {
            const field = td.dataset.field;
            if (field === 'docente') docente = td.textContent.trim();
            else if (field === 'catedra') catedraId = td.dataset.id;
            else if (field === 'aula') aulaId = td.dataset.id;
            else if (field === 'fecha_fin_semestre') fechaFin = td.textContent.trim();
            else if (field === 'hora_inicio') horaInicio = td.textContent.trim();
            else if (field === 'hora_fin') horaFin = td.textContent.trim();
        });

        // Crear el contenido expandido
        const contenido = document.createElement('tr');
        contenido.classList.add('grupo-edicion-expandida', 'bg-[#0f172a]');
        contenido.innerHTML = `
            <td colspan="10" class="p-4">
                <div class="flex flex-col gap-3">
                    <!-- Campos básicos -->
                    <div class="flex gap-2">
                        <input id="edit-docente-${grupoId}"
                               value="${docente}"
                               placeholder="Docente"
                               class="input input-xs bg-[#1a1a1a] text-white flex-1">

                        <select id="edit-catedra-${grupoId}" class="select select-xs bg-[#1a1a1a] text-white flex-1">
                            ${window.APP_DATA.catedras.map(c => 
                                `<option value="${c.id}" ${c.id == catedraId ? 'selected' : ''}>${c.nombre}</option>`
                            ).join('')}
                        </select>

                        <select id="edit-aula-${grupoId}" class="select select-xs bg-[#1a1a1a] text-white w-32">
                            ${window.APP_DATA.aulas.map(a => 
                                `<option value="${a.id}" ${a.id == aulaId ? 'selected' : ''}>${a.numero}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="flex gap-2">
                        <input id="edit-fecha-fin-${grupoId}"
                               type="date"
                               value="${fechaFin}"
                               class="input input-xs bg-[#1a1a1a] text-white w-44">

                        <input id="edit-hora-inicio-${grupoId}"
                               value="${horaInicio}"
                               readonly
                               class="input input-xs bg-[#1a1a1a] text-white w-28 time-input-edit">

                        <input id="edit-hora-fin-${grupoId}"
                               value="${horaFin}"
                               readonly
                               class="input input-xs bg-[#1a1a1a] text-white w-28 time-input-edit">
                    </div>

                    <!-- Selector de requerimientos (IGUAL QUE AULAS.JS) -->
                    <div>
                        <label class="text-gray-300 text-xs mb-1 block">Requerimientos:</label>
                        <div class="relative mb-2">
                            <i data-lucide="search" class="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text"
                                   id="buscador-req-${grupoId}"
                                   placeholder="Buscar requerimiento..."
                                   class="input input-xs w-full pl-8 bg-[#0f172a] border-white/10 text-white" />
                        </div>

                        <div id="lista-req-${grupoId}"
                             class="max-h-32 overflow-y-auto space-y-1 p-2 rounded-xl bg-[#0f172a] border border-white/10">
                            ${window.APP_DATA.requerimientos.map(r => `
                                <label class="flex items-center gap-2 text-gray-300 text-xs cursor-pointer requerimiento-item-edit">
                                    <input type="checkbox"
                                           class="checkbox checkbox-xs"
                                           value="${r.id}"
                                           ${requerimientosIds.includes(r.id) ? 'checked' : ''}>
                                    <span class="requerimiento-nombre-edit">${r.nombre}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Botones -->
                    <div class="flex gap-2">
                        <button class="btn btn-xs btn-success btn-outline btn-guardar-grupo gap-1">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            Guardar
                        </button>
                        <button class="btn btn-xs btn-warning btn-outline btn-cancelar-grupo gap-1">
                            <i data-lucide="x" class="w-3.5 h-3.5"></i>
                            Cancelar
                        </button>
                    </div>
                </div>
            </td>
        `;

        // Insertar después de la fila principal
        tr.insertAdjacentElement('afterend', contenido);
        lucide.createIcons();

        // Buscador de requerimientos
        const buscadorReq = document.getElementById(`buscador-req-${grupoId}`);
        const items = contenido.querySelectorAll('.requerimiento-item-edit');
        buscadorReq.addEventListener('input', () => {
            const texto = buscadorReq.value.toLowerCase();
            items.forEach(item => {
                const nombre = item.querySelector('.requerimiento-nombre-edit').innerText.toLowerCase();
                item.style.display = nombre.includes(texto) ? 'flex' : 'none';
            });
        });

        // Botones
        contenido.querySelector('.btn-guardar-grupo').onclick = () => guardarGrupo(grupoId, contenido);
        contenido.querySelector('.btn-cancelar-grupo').onclick = () => cancelarEdicion();
    }

    function guardarGrupo(grupoId, contenidoExpandido) {
        const docente = document.getElementById(`edit-docente-${grupoId}`).value.trim();
        const catedraId = document.getElementById(`edit-catedra-${grupoId}`).value;
        const aulaId = document.getElementById(`edit-aula-${grupoId}`).value;
        const fechaFin = document.getElementById(`edit-fecha-fin-${grupoId}`).value;
        const horaInicio = document.getElementById(`edit-hora-inicio-${grupoId}`).value;
        const horaFin = document.getElementById(`edit-hora-fin-${grupoId}`).value;

        const requerimientos = Array.from(
            contenidoExpandido.querySelectorAll(`#lista-req-${grupoId} input[type="checkbox"]:checked`)
        ).map(cb => cb.value);


        const formData = new FormData();
        formData.append('grupo_id', grupoId);  // ✅ ENVIAR grupo_id en POST
        formData.append('docente', docente);
        formData.append('catedra', catedraId);
        formData.append('aula', aulaId);
        formData.append('fecha_fin_semestre', fechaFin);
        formData.append('hora_inicio', horaInicio);
        formData.append('hora_fin', horaFin);
        formData.append('requerimientos', requerimientos.join(','));

        fetch(window.APP_URLS.updateGrupoSemestral, {  // ✅ SIN parámetros GET
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
        })
        .then(r => r.json().then(data => ({ok: r.ok, data})))
        .then(({ok, data}) => {
            if (ok && data.success) {
                editingRow = null;
                alert('Grupo semestral actualizado correctamente');
                recargarTabla();
            } else {
                throw new Error(data.message || 'Error al guardar');
            }
        })
        .catch(err => {
            alert(err.message);
            cancelarEdicion();
        });
    }

    // Eliminación de GRUPOS SEMESTRALES
    function initEliminacionGrupo() {
        document.querySelectorAll('.btn-eliminar-grupo').forEach(btn => {
            btn.addEventListener('click', () => {
                const tr = btn.closest('tr.grupo-padre');
                const grupoId = tr.dataset.grupoId;
                const hijos = document.querySelectorAll(`.grupo-hijo-${grupoId}`);

                if (!confirm(`¿Eliminar todo el grupo semestral (${hijos.length} reservas)?`)) return;

                const ids = Array.from(hijos).map(h => h.dataset.id);
                const formData = new FormData();
                ids.forEach(id => formData.append('ids[]', id));

                fetch(window.APP_URLS.deleteReservas, {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
                })
                .then(r => r.json().then(data => ({ok: r.ok, data})))
                .then(({ok, data}) => {
                    if (ok && data.success) {
                        alert(data.message || 'Grupo eliminado');
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

    // Edición RESERVAS OCASIONALES
    function initEdicionInline() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                const tr = btn.closest('tr');
                editarFila(tr);
            });
        });
    }

    function editarFila(tr) {
        if (editingRow && editingRow !== tr) {
            cancelarEdicion();
        }
        editingRow = tr;

        const reservaId = tr.dataset.id;
        const requerimientosIds = JSON.parse(tr.dataset.requerimientos || '[]');

        // Obtener valores actuales
        let docente = '', catedraId = '', aulaId = '', fecha = '', horaInicio = '', horaFin = '';

        tr.querySelectorAll('.editable').forEach(td => {
            const field = td.dataset.field;
            const value = td.textContent.trim();
            
            if (field === 'docente') docente = value;
            else if (field === 'catedra') catedraId = td.dataset.id;
            else if (field === 'aula') aulaId = td.dataset.id;
            else if (field === 'fecha') fecha = value;
            else if (field === 'hora_inicio') horaInicio = value;
            else if (field === 'hora_fin') horaFin = value;
        });

        // Crear el contenido expandido
        const contenido = document.createElement('tr');
        contenido.classList.add('fila-edicion-expandida', 'bg-[#0f172a]');
        contenido.innerHTML = `
            <td colspan="9" class="p-4">
                <div class="flex flex-col gap-3">
                    <!-- Campos básicos -->
                    <div class="flex gap-2">
                        <input id="edit-docente-${reservaId}"
                               value="${docente}"
                               placeholder="Docente"
                               class="input input-xs bg-[#1a1a1a] text-white flex-1">

                        <select id="edit-catedra-${reservaId}" class="select select-xs bg-[#1a1a1a] text-white flex-1">
                            ${window.APP_DATA.catedras.map(c => 
                                `<option value="${c.id}" ${c.id == catedraId ? 'selected' : ''}>${c.nombre}</option>`
                            ).join('')}
                        </select>

                        <select id="edit-aula-${reservaId}" class="select select-xs bg-[#1a1a1a] text-white w-32">
                            ${window.APP_DATA.aulas.map(a => 
                                `<option value="${a.id}" ${a.id == aulaId ? 'selected' : ''}>${a.numero}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="flex gap-2">
                        <input id="edit-fecha-${reservaId}"
                               type="date"
                               value="${fecha}"
                               class="input input-xs bg-[#1a1a1a] text-white w-44">

                        <input id="edit-hora-inicio-${reservaId}"
                               value="${horaInicio}"
                               readonly
                               class="input input-xs bg-[#1a1a1a] text-white w-28 time-input-edit">

                        <input id="edit-hora-fin-${reservaId}"
                               value="${horaFin}"
                               readonly
                               class="input input-xs bg-[#1a1a1a] text-white w-28 time-input-edit">
                    </div>

                    <!-- Selector de requerimientos (IGUAL QUE AULAS.JS) -->
                    <div>
                        <label class="text-gray-300 text-xs mb-1 block">Requerimientos:</label>
                        <div class="relative mb-2">
                            <i data-lucide="search" class="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text"
                                   id="buscador-req-${reservaId}"
                                   placeholder="Buscar requerimiento..."
                                   class="input input-xs w-full pl-8 bg-[#0f172a] border-white/10 text-white" />
                        </div>

                        <div id="lista-req-${reservaId}"
                             class="max-h-32 overflow-y-auto space-y-1 p-2 rounded-xl bg-[#0f172a] border border-white/10">
                            ${window.APP_DATA.requerimientos.map(r => `
                                <label class="flex items-center gap-2 text-gray-300 text-xs cursor-pointer requerimiento-item-edit">
                                    <input type="checkbox"
                                           class="checkbox checkbox-xs"
                                           value="${r.id}"
                                           ${requerimientosIds.includes(r.id) ? 'checked' : ''}>
                                    <span class="requerimiento-nombre-edit">${r.nombre}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Botones -->
                    <div class="flex gap-2">
                        <button class="btn btn-xs btn-success btn-outline btn-guardar-fila gap-1">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            Guardar
                        </button>
                        <button class="btn btn-xs btn-warning btn-outline btn-cancelar-fila gap-1">
                            <i data-lucide="x" class="w-3.5 h-3.5"></i>
                            Cancelar
                        </button>
                    </div>
                </div>
            </td>
        `;

        // Insertar después de la fila principal
        tr.insertAdjacentElement('afterend', contenido);
        lucide.createIcons();

        // Buscador de requerimientos
        const buscadorReq = document.getElementById(`buscador-req-${reservaId}`);
        const items = contenido.querySelectorAll('.requerimiento-item-edit');
        buscadorReq.addEventListener('input', () => {
            const texto = buscadorReq.value.toLowerCase();
            items.forEach(item => {
                const nombre = item.querySelector('.requerimiento-nombre-edit').innerText.toLowerCase();
                item.style.display = nombre.includes(texto) ? 'flex' : 'none';
            });
        });

        // Botones
        contenido.querySelector('.btn-guardar-fila').onclick = () => guardarFila(reservaId, contenido);
        contenido.querySelector('.btn-cancelar-fila').onclick = () => cancelarEdicion();
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

        document.addEventListener('focusin', e => {
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

    function guardarFila(reservaId, contenidoExpandido) {
        const docente = document.getElementById(`edit-docente-${reservaId}`).value.trim();
        const catedraId = document.getElementById(`edit-catedra-${reservaId}`).value;
        const aulaId = document.getElementById(`edit-aula-${reservaId}`).value;
        const fecha = document.getElementById(`edit-fecha-${reservaId}`).value;
        const horaInicio = document.getElementById(`edit-hora-inicio-${reservaId}`).value;
        const horaFin = document.getElementById(`edit-hora-fin-${reservaId}`).value;

        const requerimientos = Array.from(
            contenidoExpandido.querySelectorAll(`#lista-req-${reservaId} input[type="checkbox"]:checked`)
        ).map(cb => cb.value);

        const formData = new FormData();
        formData.append('field', 'docente');
        formData.append('value', docente);
        formData.append('field', 'catedra');
        formData.append('value', catedraId);
        formData.append('field', 'aula');
        formData.append('value', aulaId);
        formData.append('field', 'fecha');
        formData.append('value', fecha);
        formData.append('field', 'hora_inicio');
        formData.append('value', horaInicio);
        formData.append('field', 'hora_fin');
        formData.append('value', horaFin);
        formData.append('field', 'requerimientos');
        formData.append('value', requerimientos.join(','));

        fetch(window.APP_URLS.updateReserva(reservaId), {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken() }
        })
        .then(r => r.json().then(data => ({ok: r.ok, data})))
        .then(({ok, data}) => {
            if (ok && data.success) {
                editingRow = null;
                alert('Reserva actualizada correctamente');
                recargarTabla();
            } else {
                throw new Error(data.message || 'Error al guardar');
            }
        })
        .catch(err => {
            alert(err.message);
            cancelarEdicion();
        });
    }

    function cancelarEdicion() {
        if (!editingRow) return;
        
        // Remover la fila expandida
        const expandida = document.querySelector('.fila-edicion-expandida, .grupo-edicion-expandida');
        if (expandida) expandida.remove();
        
        editingRow = null;
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