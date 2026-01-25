// aulas.js

document.addEventListener('DOMContentLoaded', function() {
    const buscador = document.getElementById("buscador");
    const orden = document.getElementById("orden");
    const lista = document.getElementById("lista-aulas");
    const btnEliminarSeleccionados = document.getElementById('btn-eliminar-seleccionados');
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

    let timeout = null;
    let editingItem = null;
    let seleccionados = new Set(); // 👈 Mantener selección entre búsquedas

    /* ======================
       CARGAR LISTA
    ====================== */
    function cargarAulas() {
        const q = buscador.value;
        const order = orden.value;

        fetch(`?q=${encodeURIComponent(q)}&order=${order}`)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const nuevaLista = doc.getElementById('lista-aulas');
                lista.innerHTML = nuevaLista.innerHTML;
                
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
        document.querySelectorAll('.select-row').forEach(cb => {
            if (cb.checked) {
                seleccionados.add(cb.dataset.id);
            } else {
                seleccionados.delete(cb.dataset.id);
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
        guardarSeleccion();
        timeout = setTimeout(() => {
            cargarAulas();
        }, 300);
    });

    orden.addEventListener('change', () => {
        guardarSeleccion();
        cargarAulas();
    });

    /* ======================
       CHECKBOXES
    ====================== */
    function actualizarBotonEliminar() {
        const checkedCount = seleccionados.size;
        btnEliminarSeleccionados.disabled = checkedCount === 0;
        btnEliminarSeleccionados.textContent = checkedCount > 0 
            ? `Eliminar (${checkedCount})` 
            : 'Eliminar seleccionados';
    }

    /* ======================
       ELIMINAR SELECCIONADOS
    ====================== */
    btnEliminarSeleccionados.addEventListener('click', () => {
        const ids = Array.from(seleccionados);

        if (ids.length === 0) return;
        if (!confirm(`¿Eliminar ${ids.length} aula(s)?`)) return;

        const formData = new FormData();
        ids.forEach(id => formData.append('ids[]', id));

        fetch(window.APP_URLS.eliminarAulasMasivo, {
            method: "POST",
            body: formData,
            headers: {
                "X-CSRFToken": csrftoken
            }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                seleccionados.clear();
                cargarAulas();
            } else {
                alert(data.message || 'Error al eliminar aulas');
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

        btnAgregar.addEventListener("click", mostrarModalAgregar);
    }

    function mostrarModalAgregar() {
        const wrapper = document.getElementById("agregar-wrapper");

        wrapper.innerHTML = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="modal-agregar">
                <div class="bg-[#020617] p-6 rounded-2xl border border-white/10 w-full max-w-md">
                    <h3 class="text-white text-lg font-semibold mb-4">Agregar Aula</h3>
                    
                    <div class="flex gap-2 mb-3">
                        <input id="nuevo-numero" 
                               placeholder="Número de aula"
                               class="input input-sm bg-[#0f172a] border-white/10 text-white flex-1">

                        <input id="nueva-capacidad" 
                               type="number" 
                               placeholder="Capacidad"
                               class="input input-sm bg-[#0f172a] border-white/10 text-white w-28">
                    </div>

                    <div class="mb-4">
                        <div class="relative mb-2">
                            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text"
                                   id="buscador-req-nuevo"
                                   placeholder="Buscar requerimiento..."
                                   class="input input-sm w-full pl-10 bg-[#0f172a] border-white/10 text-white" />
                        </div>

                        <div id="lista-req-nuevo"
                             class="max-h-48 overflow-y-auto space-y-2 p-3 rounded-xl bg-[#0f172a] border border-white/10">
                            ${window.requerimientosGlobales.map(r => `
                                <label class="flex items-center gap-3 text-gray-300 cursor-pointer requerimiento-item-nuevo">
                                    <input type="checkbox" class="checkbox checkbox-sm" value="${r.id}">
                                    <span class="requerimiento-nombre-nuevo">${r.nombre}</span>
                                </label>
                            `).join("")}
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button id="guardar-aula" class="btn btn-success btn-sm flex-1 gap-1">
                            <i data-lucide="check" class="w-4 h-4"></i>
                            Guardar
                        </button>
                        <button id="cancelar-aula" class="btn btn-ghost btn-sm gap-1">
                            <i data-lucide="x" class="w-4 h-4"></i>
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Re-inicializar iconos
        lucide.createIcons();

        // Buscador de requerimientos
        const buscadorReq = document.getElementById('buscador-req-nuevo');
        const items = document.querySelectorAll('.requerimiento-item-nuevo');
        buscadorReq.addEventListener('input', () => {
            const texto = buscadorReq.value.toLowerCase();
            items.forEach(item => {
                const nombre = item.querySelector('.requerimiento-nombre-nuevo').innerText.toLowerCase();
                item.style.display = nombre.includes(texto) ? 'flex' : 'none';
            });
        });

        document.getElementById("guardar-aula").onclick = guardarNuevaAula;
        document.getElementById("cancelar-aula").onclick = restaurarBotonAgregar;
    }

    function guardarNuevaAula() {
        const numero = document.getElementById("nuevo-numero").value.trim();
        const capacidad = document.getElementById("nueva-capacidad").value.trim();

        if (!numero || !capacidad) {
            alert('Completa todos los campos');
            return;
        }

        const seleccionados = Array.from(
            document.querySelectorAll('#lista-req-nuevo input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        const data = new URLSearchParams();
        data.append("numero", numero);
        data.append("capacidad", capacidad);
        seleccionados.forEach(r => data.append("requerimientos[]", r));

        fetch(window.APP_URLS.crearAula, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrftoken,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: data.toString()
        }).then(() => {
            restaurarBotonAgregar();
            cargarAulas();
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
       ACTIVAR EVENTOS
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

        // EDITAR
        document.querySelectorAll(".btn-editar").forEach(btn => {
            btn.onclick = () => {
                const item = btn.closest('.aula-item');
                const id = btn.dataset.id;

                if (seleccionados.size > 1) {
                    alert('No puedes editar mientras tienes varias aulas seleccionadas.');
                    return;
                }

                if (editingItem && editingItem !== item) {
                    cancelarEdicion();
                    return;
                }

                editingItem = item;

                const numero = item.dataset.numero;
                const capacidad = item.dataset.capacidad;
                const requerimientosIds = JSON.parse(item.dataset.requerimientos || '[]');

                const contenido = item.querySelector('.contenido-aula');
                const acciones = item.querySelector('.acciones-wrapper');

                contenido.innerHTML = `
                    <div class="flex gap-2 mb-3">
                        <input id="edit-numero-${id}"
                               value="${numero}"
                               placeholder="Número"
                               class="input input-xs bg-[#0f172a] border-white/10 text-white w-24">

                        <input id="edit-capacidad-${id}"
                               type="number"
                               value="${capacidad}"
                               placeholder="Capacidad"
                               class="input input-xs bg-[#0f172a] border-white/10 text-white w-28">
                    </div>

                    <div>
                        <div class="relative mb-2">
                            <i data-lucide="search" class="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text"
                                   id="buscador-req-${id}"
                                   placeholder="Buscar requerimiento..."
                                   class="input input-xs w-full pl-8 bg-[#0f172a] border-white/10 text-white" />
                        </div>

                        <div id="lista-req-${id}"
                             class="max-h-32 overflow-y-auto space-y-1 p-2 rounded-xl bg-[#0f172a] border border-white/10">
                            ${window.requerimientosGlobales.map(r => `
                                <label class="flex items-center gap-2 text-gray-300 text-xs cursor-pointer requerimiento-item-edit">
                                    <input type="checkbox"
                                           class="checkbox checkbox-xs"
                                           value="${r.id}"
                                           ${requerimientosIds.includes(r.id) ? 'checked' : ''}>
                                    <span class="requerimiento-nombre-edit">${r.nombre}</span>
                                </label>
                            `).join("")}
                        </div>
                    </div>
                `;

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

                // Buscador de requerimientos
                const buscadorReq = document.getElementById(`buscador-req-${id}`);
                const items = document.querySelectorAll('.requerimiento-item-edit');
                buscadorReq.addEventListener('input', () => {
                    const texto = buscadorReq.value.toLowerCase();
                    items.forEach(item => {
                        const nombre = item.querySelector('.requerimiento-nombre-edit').innerText.toLowerCase();
                        item.style.display = nombre.includes(texto) ? 'flex' : 'none';
                    });
                });

                // Focus
                document.getElementById(`edit-numero-${id}`).focus();

                // GUARDAR
                acciones.querySelector('.btn-guardar').onclick = () => {
                    const nuevoNumero = document.getElementById(`edit-numero-${id}`).value.trim();
                    const nuevaCapacidad = document.getElementById(`edit-capacidad-${id}`).value.trim();

                    if (!nuevoNumero || !nuevaCapacidad) {
                        alert('Completa todos los campos');
                        return;
                    }

                    const seleccionados = Array.from(
                        document.querySelectorAll(`#lista-req-${id} input[type="checkbox"]:checked`)
                    ).map(cb => cb.value);

                    const data = new URLSearchParams();
                    data.append("numero", nuevoNumero);
                    data.append("capacidad", nuevaCapacidad);
                    seleccionados.forEach(r => data.append("requerimientos[]", r));

                    fetch(`${window.APP_URLS.editarAula}${id}/editar/`, {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": csrftoken,
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: data.toString()
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            editingItem = null;
                            guardarSeleccion();
                            cargarAulas();
                        } else {
                            alert(data.message || 'Error al guardar');
                        }
                    })
                    .catch(() => {
                        alert('Error de conexión');
                    });
                };

                // CANCELAR
                acciones.querySelector('.btn-cancelar').onclick = () => {
                    cancelarEdicion();
                };
            };
        });

        // ELIMINAR
        document.querySelectorAll(".btn-eliminar").forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;

                if (!confirm("¿Eliminar esta aula?")) return;

                fetch(`${window.APP_URLS.eliminarAula}${id}/eliminar/`, {
                    method: "POST",
                    headers: { "X-CSRFToken": csrftoken }
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        seleccionados.delete(id);
                        cargarAulas();
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
        cargarAulas();
    }

    // 🚀 INICIALIZAR TODO
    initAgregarButton();
    activarEventos();
});