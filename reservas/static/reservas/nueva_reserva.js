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

});