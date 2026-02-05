document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Cargado - Iniciando script agenda_por_aula.js');

    const horasColumna = document.getElementById('col-horas');
    const btnFiltrar = document.getElementById('btn-filtrar');
    const infoSemana = document.getElementById('info-semana');
    const fechaInicio = document.getElementById('fecha-inicio');
    const fechaFin = document.getElementById('fecha-fin');

    console.log('Elementos encontrados:', {
        horasColumna: !!horasColumna,
        btnFiltrar: !!btnFiltrar,
        infoSemana: !!infoSemana
    });

    // Generar horas (7:00 a 21:00)
    for (let h = 7; h <= 21; h++) {
        const divHora = document.createElement('div');
        divHora.className = 'hora';
        divHora.innerText = (h < 10 ? '0' : '') + h + ":00";
        horasColumna.appendChild(divHora);
    }

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

    function formatearFechaAPI(fecha) {
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }

    function cargarReservas() {
        console.log('🔄 Botón filtrar clickeado');

        const aulaId = document.getElementById('select-aula').value;
        const fechaInput = document.getElementById('fecha').value;

        console.log('Valores:', { aulaId, fechaInput });

        if (!aulaId || !fechaInput) {
            alert('Selecciona un aula y una fecha');
            return;
        }

        // Limpiar columnas de reservas
        document.querySelectorAll('.dia-reservas').forEach(col => col.innerHTML = '');

        const lunes = obtenerLunesDeLaSemana(fechaInput);
        const fechasSemana = [];
        
        for (let i = 0; i < 6; i++) {
            const fecha = new Date(lunes);
            fecha.setDate(lunes.getDate() + i);
            fechasSemana.push(fecha);
        }

        // Actualizar fechas en headers
        const columnas = document.querySelectorAll('.dia-columna');
        fechasSemana.forEach((fecha, index) => {
            const fechaSpan = columnas[index].querySelector('.dia-fecha');
            if (fechaSpan) {
                fechaSpan.textContent = `(${formatearFecha(fecha)})`;
                console.log(`✅ Fecha columna ${index}:`, formatearFecha(fecha));
            }
        });

        // Mostrar info semana
        fechaInicio.textContent = formatearFecha(fechasSemana[0]);
        fechaFin.textContent = formatearFecha(fechasSemana[5]);
        infoSemana.classList.remove('hidden');

        // Cargar reservas por día
        const promesas = fechasSemana.map(fecha => {
            const fechaStr = formatearFechaAPI(fecha);
            const url = `/calendario/api/reservas/?aula=${aulaId}&fecha=${fechaStr}`;
            console.log('📡 Fetch:', url);
            
            return fetch(url)
                .then(response => {
                    console.log('📥 Response:', response.status);
                    return response.json();
                })
                .then(reservas => {
                    console.log('✅ Reservas:', reservas);
                    return { fecha: fechaStr, reservas };
                })
                .catch(error => {
                    console.error('❌ Error:', error);
                    return { fecha: fechaStr, reservas: [] };
                });
        });

        Promise.all(promesas).then(resultados => {
            console.log('🎉 Resultados completos:', resultados);
            
            resultados.forEach((resultado, diaIndex) => {
                const columnaReservas = columnas[diaIndex].querySelector('.dia-reservas');
                
                resultado.reservas.forEach(r => {
                    const [hInicio, mInicio] = r.hora_inicio.split(':').map(Number);
                    const [hFin, mFin] = r.hora_fin.split(':').map(Number);
                    const inicioDecimal = hInicio + (mInicio / 60);
                    const finDecimal = hFin + (mFin / 60);
                    const duracionHoras = finDecimal - inicioDecimal;

                    const div = document.createElement('div');
                    div.className = 'reserva ' + r.tipo;
                    div.style.top = ((inicioDecimal - 7) * 60) + 'px';
                    div.style.height = (duracionHoras * 60 - 1) + 'px';

                    if (duracionHoras <= 1.5) {
                        div.innerHTML = `
                            <div class="reserva-compacta">
                                <div class="fila font-bold">${r.docente}</div>
                                <div class="fila">${r.catedra}</div>
                                <div class="req">${r.requerimientos.join(', ')}</div>
                            </div>
                        `;
                    } else {
                        div.innerHTML = `
                            <div class="reserva-normal">
                                <div class="font-bold">${r.docente}</div>
                                <div>${r.catedra}</div>
                                <div style="font-size: 10px; background: rgba(255, 255, 255, 0.15); padding: 3px 5px; border-radius: 3px; margin-top: 4px; font-weight: 500;">${r.requerimientos.join(', ')}</div>
                            </div>
                        `;
                    }

                    columnaReservas.appendChild(div);
                });
            });
        });
    }

    btnFiltrar.addEventListener('click', cargarReservas);
    console.log('✅ Event listener agregado');
});