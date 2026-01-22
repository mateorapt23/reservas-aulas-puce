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
        editingRow = tr;

        tr.querySelectorAll('.editable').forEach(td => {
            const field = td.dataset.field;
            let value = td.textContent.trim();
            let inputHtml = '';

            if (field === 'fecha') {
                inputHtml = `<input type="date" value="${value}" class="input input-xs bg-base-300">`;
            } 
            else if (field === 'hora_inicio' || field === 'hora_fin') {
                inputHtml = `<input type="time" value="${value}" class="input input-xs bg-base-300">`;
            } 
            else if (field === 'tipo') {
                inputHtml = `
                    <select class="select select-xs bg-base-300 w-full">
                        <option value="ocasional" ${value.includes('Ocasional') ? 'selected' : ''}>Ocasional</option>
                        <option value="semestral" ${value.includes('Semestral') ? 'selected' : ''}>Semestral</option>
                    </select>`;
            }
            else if (field === 'catedra') {
                const currentId = td.dataset.id;
                let options = window.APP_DATA.catedras.map(c => 
                    `<option value="${c.id}" ${c.id == currentId ? 'selected' : ''}>${c.nombre}</option>`
                ).join('');
                inputHtml = `<select class="select select-xs bg-base-300 w-full">${options}</select>`;
            }
            else if (field === 'aula') {
                const currentId = td.dataset.id;
                let options = window.APP_DATA.aulas.map(a => 
                    `<option value="${a.id}" ${a.id == currentId ? 'selected' : ''}>Aula ${a.numero}</option>`
                ).join('');
                inputHtml = `<select class="select select-xs bg-base-300 w-full">${options}</select>`;
            }
            else {
                inputHtml = `<input type="text" value="${value}" class="input input-xs bg-base-300 w-full">`;
            }

            td.innerHTML = inputHtml;
        });

        const accionesTd = tr.lastElementChild;
        accionesTd.innerHTML = `
            <button class="btn-guardar btn btn-xs btn-success btn-outline">Guardar</button>
            <button class="btn-cancelar btn btn-xs btn-warning btn-outline">Cancelar</button>
        `;

        accionesTd.querySelector('.btn-guardar').onclick = () => guardarFila(tr);
        accionesTd.querySelector('.btn-cancelar').onclick = () => cancelarEdicion(tr);
    }

    function guardarFila(tr) {
        const id = tr.dataset.id;
        const formData = new FormData();

        tr.querySelectorAll('.editable').forEach(td => {
            const field = td.dataset.field;
            const input = td.querySelector('input, select');
            let value = input ? input.value.trim() : '';

            formData.append(field, value);
        });

        fetch(window.APP_URLS.updateReserva(id), {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': window.CSRF_TOKEN || getCsrfToken()
            }
        })
        .then(r => {
            if (!r.ok) {
                throw new Error(`HTTP error! status: ${r.status}`);
            }
            return r.json();
        })
        .then(data => {
            if (data.success) {
                recargarTabla();
            } else {
                alert(data.message || 'Error al guardar los cambios');
                cancelarEdicion(tr);
            }
        })
        .catch(err => {
            console.error('Error completo:', err);
            alert('Error de conexión al guardar: ' + err.message);
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

    // Iniciar
    initAllEvents();
});