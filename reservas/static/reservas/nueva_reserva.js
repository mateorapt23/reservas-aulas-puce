document.addEventListener('DOMContentLoaded', () => {

    /* =========================
       TIPO DE RESERVA
    ========================= */
    const tipoRadios = document.querySelectorAll('input[name="tipo"]');
    const finWrapper = document.getElementById('fin-semestre-wrapper');
    const finInput = document.getElementById('fin_semestre');
    

    function actualizarTipo() {
        const tipo = document.querySelector('input[name="tipo"]:checked').value;

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
                    let gradient    = 'from-red-950/60 to-red-900/50';   // base fuerte en rojo
                    let borderColor = 'red-700/60';
                    let horaColor   = 'red-300';

                    if (r.tipo === 'semestral') {
                        gradient    = 'from-red-950/60 via-indigo-950/30 to-red-900/50';
                        borderColor = 'indigo-600/50';
                        horaColor   = 'indigo-300';
                    } 
                    else if (r.tipo === 'ocasional') {
                        gradient    = 'from-red-950/60 via-emerald-950/30 to-red-900/50';
                        borderColor = 'emerald-600/50';
                        horaColor   = 'emerald-300';
                    }

                    let displayText = r.catedra || '—';

                    agendaLista.innerHTML += `
                        <div class="p-4 rounded-xl bg-gradient-to-r ${gradient} border border-${borderColor} shadow-sm">
                            <p class="text-sm font-medium ${horaColor}">
                                ${r.inicio} – ${r.fin}
                            </p>
                            <p class="text-sm text-gray-100 mt-1">
                                ${displayText} - Reservado
                            </p>
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

});