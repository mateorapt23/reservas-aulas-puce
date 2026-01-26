// requerimientos.js

document.addEventListener('DOMContentLoaded', function() {
    const buscador = document.getElementById('buscador');
    const orden = document.getElementById('orden');
    const lista = document.getElementById('lista-requerimientos');
    const btnEliminarSeleccionados = document.getElementById('btn-eliminar-seleccionados');
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

    let timeout = null;
    let editingItem = null;
    let seleccionados = new Set(); // 👈 Mantener selección entre búsquedas

    /* ======================
       CARGAR LISTA
    ====================== */
    function cargarRequerimientos() {
        const q = buscador.value;
        const order = orden.value;

        fetch(`?q=${encodeURIComponent(q)}&order=${order}`)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const nuevaLista = doc.getElementById('lista-requerimientos');
                lista.innerHTML = nuevaLista.innerHTML;
                
                // Restaurar selección después de recargar
                restaurarSeleccion();
                activarEventos();
                actualizarBotonEliminar();
                
                // Re-inicializar iconos
                lucide.createIcons();
            });
    }

    /* ======================
       GUARDAR Y RESTAURAR SELECCIÓN
    ====================== */
    function guardarSeleccion() {
        // NO limpiar el Set, solo actualizar basado en los checkboxes VISIBLES
        document.querySelectorAll('.select-row').forEach(cb => {
            if (cb.checked) {
                seleccionados.add(cb.dataset.id); // Agregar si está marcado
            } else {
                seleccionados.delete(cb.dataset.id); // Quitar si está desmarcado
            }
        });
    }

    function restaurarSeleccion() {
        document.querySelectorAll('.select-row').forEach(cb => {
            if (seleccionados.has(cb.dataset.id)) {
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

    /* ======================
       BUSCADOR DINÁMICO
    ====================== */
    buscador.addEventListener('input', () => {
        clearTimeout(timeout);
        guardarSeleccion(); // 👈 Guardar INMEDIATAMENTE antes de que desaparezcan los checkboxes
        timeout = setTimeout(() => {
            cargarRequerimientos();
        }, 300);
    });

    orden.addEventListener('change', () => {
        guardarSeleccion(); // 👈 Guardar antes de ordenar
        cargarRequerimientos();
    });

    /* ======================
       CHECKBOXES
    ====================== */
    function actualizarBotonEliminar() {
        const checkedCount = seleccionados.size; // 👈 Contar desde el Set, no del DOM
        btnEliminarSeleccionados.disabled = checkedCount === 0;
        btnEliminarSeleccionados.textContent = checkedCount > 0 
            ? `Eliminar (${checkedCount})` 
            : 'Eliminar seleccionados';
    }

    /* ======================
       ELIMINAR SELECCIONADOS
    ====================== */
    btnEliminarSeleccionados.addEventListener('click', () => {
        const ids = Array.from(seleccionados); // 👈 Usar el Set directamente

        if (ids.length === 0) return;
        if (!confirm(`¿Eliminar ${ids.length} requerimiento(s)?`)) return;

        const formData = new FormData();
        ids.forEach(id => formData.append('ids[]', id));

        fetch(window.APP_URLS.eliminarRequerimientosMasivo, {
            method: "POST",
            body: formData,
            headers: {
                "X-CSRFToken": csrftoken
            }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                seleccionados.clear(); // 👈 Limpiar selección después de eliminar
                cargarRequerimientos();
            } else {
                alert(data.message || 'Error al eliminar requerimientos');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error de conexión al eliminar');
        });
    });

    /* ======================
       AGREGAR (ARREGLADO 🔧)
    ====================== */
    function initAgregarButton() {
        const btnAgregar = document.getElementById("btn-agregar");
        if (!btnAgregar) return;

        btnAgregar.addEventListener("click", mostrarFormularioAgregar);
    }

    function mostrarFormularioAgregar() {
        const wrapper = document.getElementById("agregar-wrapper");

        wrapper.innerHTML = `
            <input id="nuevo-nombre"
                   class="input input-sm bg-[#0f172a] border-white/10 text-white w-40"
                   placeholder="Nuevo..." />
            <button id="guardar-nuevo" class="btn btn-success btn-sm gap-1">
                <i data-lucide="check" class="w-4 h-4"></i>
            </button>
            <button id="cancelar-nuevo" class="btn btn-ghost btn-sm gap-1">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;

        document.getElementById("nuevo-nombre").focus();
        
        // Re-inicializar iconos
        lucide.createIcons();

        document.getElementById("guardar-nuevo").onclick = guardarNuevoRequerimiento;
        document.getElementById("cancelar-nuevo").onclick = restaurarBotonAgregar;
    }

    function guardarNuevoRequerimiento() {
        const nombre = document.getElementById("nuevo-nombre").value.trim();
        
        if (!nombre) {
            alert('El nombre no puede estar vacío');
            return;
        }

        fetch(window.APP_URLS.crearRequerimiento, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrftoken,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `nombre=${encodeURIComponent(nombre)}`
        }).then(() => {
            restaurarBotonAgregar();
            cargarRequerimientos();
        });
    }

    function restaurarBotonAgregar() {
        const wrapper = document.getElementById("agregar-wrapper");
        wrapper.innerHTML = `
            <button type="button" id="btn-agregar" class="btn btn-primary btn-sm gap-2">
                <i data-lucide="plus" class="w-4 h-4"></i>
                Agregar
            </button>
        `;
        // Re-inicializar iconos
        lucide.createIcons();
        // 🔧 FIX: Re-inicializar el event listener después de restaurar
        initAgregarButton();
    }

    /* ======================
       EDITAR / ELIMINAR
    ====================== */
    function activarEventos() {

        // SELECT ALL
        const selectAll = document.getElementById('select-all');
        if (selectAll) {
            selectAll.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll('.select-row');
                checkboxes.forEach(cb => {
                    cb.checked = selectAll.checked;
                });
                guardarSeleccion();
                actualizarBotonEliminar();
            });
        }

        // Checkboxes individuales
        document.querySelectorAll('.select-row').forEach(cb => {
            cb.addEventListener('change', () => {
                guardarSeleccion();
                actualizarSelectAll();
                actualizarBotonEliminar();
            });
        });

        // Editar
        document.querySelectorAll(".btn-editar").forEach(btn => {
            btn.onclick = () => {
                const item = btn.closest('.requerimiento-item');
                const id = btn.dataset.id;

                // Verificar si hay múltiples seleccionados (usando el Set)
                if (seleccionados.size > 1) {
                    alert('No puedes editar mientras tienes varios requerimientos seleccionados.');
                    return;
                }

                // Si hay otro item en edición, cancelarlo primero
                if (editingItem && editingItem !== item) {
                    cancelarEdicion();
                    return;
                }

                editingItem = item;
                
                const span = item.querySelector('.nombre-requerimiento');
                const original = span.textContent.trim();
                const acciones = item.querySelector('.acciones-wrapper');

                // Convertir nombre a input (ancho limitado)
                span.innerHTML = `
                    <input value="${original}"
                           class="input input-xs bg-[#0f172a] border-white/10 text-white"
                           style="max-width: 300px;"
                           id="edit-${id}" />
                `;
                
                // Cambiar botones por Guardar/Cancelar
                acciones.innerHTML = `
                    <button class="btn btn-xs btn-success btn-outline btn-guardar gap-1 hover:bg-green-500/10 transition-all">
                        <i data-lucide="check" class="w-3.5 h-3.5"></i>
                        Guardar
                    </button>
                    <button class="btn btn-xs btn-warning btn-outline btn-cancelar gap-1 hover:bg-yellow-500/10 transition-all">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                        Cancelar
                    </button>
                `;

                // Re-inicializar iconos
                lucide.createIcons();

                // Focus en el input
                document.getElementById(`edit-${id}`).focus();

                // Guardar
                acciones.querySelector('.btn-guardar').onclick = () => {
                    const nuevo = document.getElementById(`edit-${id}`).value.trim();

                    if (!nuevo) {
                        alert('El nombre no puede estar vacío');
                        return;
                    }

                    fetch(`${window.APP_URLS.editarRequerimiento}${id}/editar/`, {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": csrftoken,
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: `nombre=${encodeURIComponent(nuevo)}`
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            editingItem = null;
                            guardarSeleccion();
                            cargarRequerimientos();
                        } else {
                            alert(data.message || 'Error al guardar');
                        }
                    })
                    .catch(() => {
                        alert('Error de conexión');
                    });
                };

                // Cancelar
                acciones.querySelector('.btn-cancelar').onclick = () => {
                    cancelarEdicion();
                };
            };
        });

        // Eliminar individual
        document.querySelectorAll(".btn-eliminar").forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                console.log("ID a eliminar:", id, btn); 

                if (!confirm("¿Eliminar este requerimiento?")) return;

                fetch(`${window.APP_URLS.eliminarRequerimiento}${id}/eliminar/`, {
                    method: "POST",
                    headers: { "X-CSRFToken": csrftoken }
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        seleccionados.delete(id); // 👈 Quitar de seleccionados
                        cargarRequerimientos();
                    } else {
                        alert(data.message || 'Error al eliminar');
                    }
                })
                .catch(() => {
                    alert('Error de conexión');
                });
            };
        });
    }

    function cancelarEdicion() {
        editingItem = null;
        guardarSeleccion();
        cargarRequerimientos();
    }

    // 🚀 INICIALIZAR TODO
    initAgregarButton();
    activarEventos();
});