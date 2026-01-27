document.addEventListener('DOMContentLoaded', () => {

    /* =========================
       TIPO DE RESERVA
    ========================= */
    const tipoRadios = document.querySelectorAll('input[name="tipo"]');
    const finWrapper = document.getElementById('fin-semestre-wrapper');
    const finInput = document.getElementById('fin_semestre');
    

    function actualizarTipo() {
        const tipoElement = document.querySelector('input[name="tipo"]:checked');
        if (!tipoElement) return; // Si no hay nada seleccionado, salir
        
        const tipo = tipoElement.value;

        if (tipo === 'semestral') {
            finWrapper.classList.remove('opacity-60');
            finInput.disabled = false;
        } else {
            finWrapper.classList.add('opacity-60');
            finInput.disabled = true;
            finInput.value = '';
        }
    }

    tipoRadios.forEach(r => r.addEventListener('change', actualizarTipo));
    actualizarTipo();


    /* =========================
       AGENDA POR AULA (DRAWER)
       ¡Con colores mejorados!
    ========================= */
    const drawer = document.getElementById('agenda-drawer');
    const agendaLista = document.getElementById('agenda-lista');
    const agendaInfo = document.getElementById('agenda-info');
    const fechaInput = document.querySelector("input[name='fecha']");

    document.querySelectorAll('.btn-ver-agenda').forEach(btn => {
        btn.addEventListener('click', async () => {

            const aulaId = btn.dataset.aula;
            const aulaNumero = btn.dataset.numero;
            const fecha = fechaInput.value;

            if (!fecha) {
                alert('Selecciona una fecha primero');
                return;
            }

            agendaLista.innerHTML = `
                <div class="text-sm text-gray-400">
                    Cargando agenda...
                </div>
            `;

            try {
                const response = await fetch(
                    `/reservas/api/agenda-aula/?aula=${aulaId}&fecha=${fecha}`
                );

                if (!response.ok) throw new Error();

                const data = await response.json();

                agendaLista.innerHTML = '';
                agendaInfo.innerText = `Aula ${aulaNumero} · ${fecha}`;

                if (data.length === 0) {
                    agendaLista.innerHTML = `
                        <div class="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400">
                            No hay reservas para esta fecha
                        </div>
                    `;
                }

                data.forEach(r => {
                    // COLORES MEJORADOS - Ahora el verde/azul se notan MUCHO más
                    let gradient, borderColor, horaColor, bgBase, iconColor;

                    if (r.tipo === 'semestral') {
                        // AZUL/INDIGO DOMINANTE para semestral
                        gradient    = 'from-indigo-950/90 via-indigo-900/70 to-blue-950/80';
                        borderColor = 'indigo-500/70';
                        horaColor   = 'indigo-200';
                        bgBase      = 'bg-indigo-500/10';
                        iconColor   = 'text-indigo-400';
                    } 
                    else if (r.tipo === 'ocasional') {
                        // VERDE/EMERALD DOMINANTE para ocasional
                        gradient    = 'from-emerald-950/90 via-emerald-900/70 to-green-950/80';
                        borderColor = 'emerald-500/70';
                        horaColor   = 'emerald-200';
                        bgBase      = 'bg-emerald-500/10';
                        iconColor   = 'text-emerald-400';
                    }
                    else {
                        // Por si acaso hay otro tipo (default)
                        gradient    = 'from-gray-950/80 via-gray-900/60 to-gray-950/70';
                        borderColor = 'gray-600/50';
                        horaColor   = 'gray-300';
                        bgBase      = 'bg-gray-500/10';
                        iconColor   = 'text-gray-400';
                    }

                    let displayText = r.catedra || '—';
                    
                    // Icono según el tipo
                    const icono = r.tipo === 'semestral' 
                        ? '' 
                        : r.tipo === 'ocasional' 
                            ? '' 
                            : '';

                    agendaLista.innerHTML += `
                        <div class="relative p-1 rounded-xl bg-gradient-to-br ${gradient} 
                                    border-2 border-${borderColor} shadow-lg overflow-hidden
                                    hover:shadow-xl transition-all duration-200">
                            
                            <!-- Efecto de brillo sutil en la esquina -->
                            <div class="absolute top-0 right-0 w-20 h-20 ${bgBase} rounded-full 
                                        blur-2xl opacity-40 -translate-y-8 translate-x-8"></div>
                            
                            <!-- Contenido -->
                            <div class="relative z-10">
                                <!-- Badge del tipo -->
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-semibold px-2 py-0.5 rounded-lg ${bgBase} 
                                                border border-${borderColor} ${horaColor}">
                                        ${icono} ${r.tipo === 'semestral' ? 'Semestral' : 'Ocasional'}
                                    </span>
                                </div>
                                
                                <!-- Hora -->
                                <p class="text-sm font-bold ${horaColor} mb-1 flex items-center gap-2">
                                    <svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    ${r.inicio} — ${r.fin}
                                </p>
                                
                                <!-- Cátedra -->
                                <p class="text-sm text-white font-medium flex items-center gap-2">
                                    <svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                    ${displayText}
                                </p>
                            </div>
                        </div>
                    `;
                });

                drawer.checked = true;

            } catch (e) {
                agendaLista.innerHTML = `
                    <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                        Error al cargar la agenda
                    </div>
                `;
            }
        });
    });

    /* =========================
       BUSCADOR DE REQUERIMIENTOS
    ========================= */
    const buscador = document.getElementById('buscador-requerimientos');

    if (buscador) {
        const items = document.querySelectorAll('.requerimiento-item');

        buscador.addEventListener('input', () => {
            const texto = buscador.value.toLowerCase();

            items.forEach(item => {
                const nombre = item
                    .querySelector('.requerimiento-nombre')
                    .innerText
                    .toLowerCase();

                item.style.display = nombre.includes(texto)
                    ? 'flex'
                    : 'none';
            });
        });
    }

    /* =========================
       BUSCADOR DE CÁTEDRA
    ========================= */
    const buscadorCatedra = document.getElementById('buscador-catedra');
    const listaCatedras = document.getElementById('lista-catedras');
    const inputCatedra = document.getElementById('catedra-seleccionada');

    if (buscadorCatedra) {
        const items = listaCatedras.querySelectorAll('.catedra-item');

        buscadorCatedra.addEventListener('focus', () => {
            listaCatedras.classList.remove('hidden');
        });

        buscadorCatedra.addEventListener('input', () => {
            const texto = buscadorCatedra.value.toLowerCase();
            listaCatedras.classList.remove('hidden');

            items.forEach(item => {
                const nombre = item.innerText.toLowerCase();
                item.style.display = nombre.includes(texto) ? 'block' : 'none';
            });
        });

        items.forEach(item => {
            item.addEventListener('click', () => {
                buscadorCatedra.value = item.innerText;
                inputCatedra.value = item.dataset.id;
                listaCatedras.classList.add('hidden');
            });
        });

        // cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#buscador-catedra') &&
                !e.target.closest('#lista-catedras')) {
                listaCatedras.classList.add('hidden');
            }
        });
    }

    /* =========================
       TIME PICKER
    ========================= */
    function crearTimePicker(inputId, pickerId) {
        const input  = document.getElementById(inputId);
        const picker = document.getElementById(pickerId);

        if (!input || !picker) {
            console.warn(`No se encontró ${inputId} o ${pickerId}`);
            return;
        }

        // Asegurarse de que empiece oculto
        picker.classList.add('hidden');
        picker.style.display = 'none';

        // Generar horas 07:00 a 21:30
        const horas = [];
        for (let h = 7; h <= 21; h++) {
            horas.push(h.toString().padStart(2, '0'));
        }

        const minutos = ['00', '30'];

        // Estructura HTML del picker
        picker.innerHTML = `
            <div class="time-column" id="${pickerId}-horas"></div>
            <div class="time-column" id="${pickerId}-minutos"></div>
        `;

        const colHoras   = picker.querySelector(`#${pickerId}-horas`);
        const colMinutos = picker.querySelector(`#${pickerId}-minutos`);

        let horaSeleccionada   = null;
        let minutoSeleccionado = null;

        function confirmarSeleccion() {
            if (horaSeleccionada && minutoSeleccionado) {
                input.value = `${horaSeleccionada}:${minutoSeleccionado}`;
                picker.classList.add('hidden');
                picker.style.display = 'none';
                input.blur(); // ayuda a que se vea más natural
            }
        }

        // Llenar horas
        horas.forEach(h => {
            const div = document.createElement('div');
            div.className = 'time-option';
            div.textContent = h;
            div.addEventListener('click', () => {
                horaSeleccionada = h;
                confirmarSeleccion();
            });
            colHoras.appendChild(div);
        });

        // Llenar minutos
        minutos.forEach(m => {
            const div = document.createElement('div');
            div.className = 'time-option';
            div.textContent = m;
            div.addEventListener('click', () => {
                minutoSeleccionado = m;
                confirmarSeleccion();
            });
            colMinutos.appendChild(div);
        });

        // Abrir al enfocar
        input.addEventListener('focus', () => {
            // Cerrar cualquier otro picker
            document.querySelectorAll('.time-picker').forEach(p => {
                p.classList.add('hidden');
                p.style.display = 'none';
            });

            picker.classList.remove('hidden');
            picker.style.display = 'grid';
        });

        // Cerrar al hacer clic fuera
        const cerrarFuera = (e) => {
            if (picker.classList.contains('hidden')) return;
            if (!input.contains(e.target) && !picker.contains(e.target)) {
                picker.classList.add('hidden');
                picker.style.display = 'none';
            }
        };

        document.addEventListener('click', cerrarFuera, true);
    }

    // Inicializar ambos pickers
    crearTimePicker('horaInicioInput', 'pickerInicio');
    crearTimePicker('horaFinInput',    'pickerFin');

    // Seguridad extra: ocultar al cargar por si acaso
    setTimeout(() => {
        document.querySelectorAll('.time-picker').forEach(p => {
            p.classList.add('hidden');
            p.style.display = 'none';
        });
    }, 50);

    /* =========================
       RESTAURAR CÁTEDRA SELECCIONADA
    ========================= */
    const inputBuscador = document.getElementById('buscador-catedra');
    const inputHidden   = document.getElementById('catedra-seleccionada');

    if (inputBuscador && inputHidden && inputHidden.value) {
        // Buscar el nombre correspondiente al ID guardado
        const itemSeleccionado = document.querySelector(`.catedra-item[data-id="${inputHidden.value}"]`);
        
        if (itemSeleccionado) {
            inputBuscador.value = itemSeleccionado.textContent.trim();
            // Opcional: marcarlo como activo en la lista (por si se vuelve a abrir)
            document.querySelectorAll('.catedra-item').forEach(item => {
                item.classList.remove('bg-white/20', 'font-medium');
            });
            itemSeleccionado.classList.add('bg-white/20', 'font-medium');
        } else {
            // Si por alguna razón no existe el item, mostrar el ID o dejar vacío
            inputBuscador.value = '(Cátedra seleccionada)';
        }
    }

    /* =========================
       MODAL DE ÉXITO AL RESERVAR
    ========================= */
    const modal = document.getElementById('modal-exito');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const aulaReservadaSpan = document.getElementById('aula-reservada');

    // Interceptar el submit de los formularios de reserva
    document.querySelectorAll('.form-reservar').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevenir el envío normal
            
            const aulaNumero = this.querySelector('.btn-reservar').dataset.aulaNumero;
            
            // Enviar el formulario con AJAX
            const formData = new FormData(this);
            
            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (response.ok) {
                    // Mostrar el modal de éxito
                    aulaReservadaSpan.textContent = `Aula ${aulaNumero}`;
                    modal.classList.remove('hidden');
                    
                    // Agregar clase para animación
                    setTimeout(() => {
                        const modalContent = document.getElementById('modal-content');
                        modalContent.style.transform = 'scale(1) translateY(0)';
                        modalContent.style.opacity = '1';
                    }, 10);
                } else {
                    alert('Hubo un error al procesar la reserva. Por favor intenta nuevamente.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Hubo un error al procesar la reserva. Por favor intenta nuevamente.');
            });
        });
    });

    // Cerrar modal y recargar página
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => {
            modal.classList.add('hidden');
            // Recargar la página para ver la reserva actualizada
            setTimeout(() => {
                window.location.reload();
            }, 200);
        });
    }

    // Cerrar modal al hacer clic en el overlay
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                setTimeout(() => {
                    window.location.reload();
                }, 200);
            }
        });
    }

    // Cerrar con la tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            setTimeout(() => {
                window.location.reload();
            }, 200);
        }
    });

});