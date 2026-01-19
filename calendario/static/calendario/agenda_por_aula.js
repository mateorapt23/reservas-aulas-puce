const horasColumna = document.getElementById('col-horas');
const reservasColumna = document.getElementById('col-reservas');
const btnFiltrar = document.getElementById('btn-filtrar');

// Generar horas de 7:00 a 21:00
for (let h = 7; h <= 21; h++) {
    const divHora = document.createElement('div');
    divHora.className = 'hora';
    divHora.innerText = (h < 10 ? '0' : '') + h + ":00";
    horasColumna.appendChild(divHora);
}

function cargarReservas() {
    reservasColumna.innerHTML = '';

    const aulaId = document.getElementById('select-aula').value;
    const fecha = document.getElementById('fecha').value;

    if (!aulaId || !fecha) return;

    fetch(`/calendario/api/reservas/?aula=${aulaId}&fecha=${fecha}`)
        .then(response => response.json())
        .then(reservas => {

            reservas.forEach(r => {

                const [hInicio, mInicio] = r.hora_inicio.split(':').map(Number);
                const [hFin, mFin] = r.hora_fin.split(':').map(Number);

                const inicioDecimal = hInicio + (mInicio / 60);
                const finDecimal = hFin + (mFin / 60);

                const duracionHoras = finDecimal - inicioDecimal;
                const esBloquePequeno = duracionHoras <= 1;

                const div = document.createElement('div');
                div.className = 'reserva ' + r.tipo;

                div.style.top = ((inicioDecimal - 7) * 60) + 'px';
                div.style.height = (duracionHoras * 60) + 'px';

                if (esBloquePequeno) {
                    // 👉 DISEÑO COMPACTO (solo para 1h o menos)
                    div.classList.add('compacta');

                    div.innerHTML = `
                        <div class="reserva-compacta">
                            <div class="fila">
                                <span class="izq font-bold">${r.docente}</span>
                                <span class="sep">|</span>
                                <span class="der">Aula ${r.aula}</span>
                            </div>

                            <div class="fila">
                                <span class="izq">${r.catedra}</span>
                                <span class="sep">|</span>
                                <span class="der capitalize"> <b>Tipo:</b> ${r.tipo}</span>
                            </div>

                            <div class="req">
                                <b>Requerimientos:</b> ${r.requerimientos.join(', ')}
                            </div>
                        </div>
                    `;
                } else {
                    // 👉 DISEÑO NORMAL (2h o más)
                    div.innerHTML = `
                        <div class="font-bold">${r.docente}</div>
                        <div>${r.catedra} | Aula ${r.aula}</div>
                        <div>Requerimientos: ${r.requerimientos.join(', ')}</div>
                        <div>Tipo: ${r.tipo}</div>
                    `;
                }

                reservasColumna.appendChild(div);
            });
        });
}

btnFiltrar.addEventListener('click', cargarReservas);