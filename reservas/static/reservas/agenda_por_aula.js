document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Cargado - Iniciando script agenda_por_aula.js');

    const horasColumna = document.getElementById('col-horas');
    const horasColumnaFin = document.getElementById('col-horas-fin');
    const btnFiltrar = document.getElementById('btn-filtrar');
    const infoSemana = document.getElementById('info-semana');
    const fechaInicio = document.getElementById('fecha-inicio');
    const fechaFin = document.getElementById('fecha-fin');

    console.log('Elementos encontrados:', {
        horasColumna: !!horasColumna,
        horasColumnaFin: !!horasColumnaFin,
        btnFiltrar: !!btnFiltrar,
        infoSemana: !!infoSemana
    });

    // Generar horas (7:00 a 21:00) en columna inicial
    for (let h = 7; h <= 21; h++) {
        const divHora = document.createElement('div');
        divHora.className = 'hora';
        divHora.innerText = (h < 10 ? '0' : '') + h + ":00";
        horasColumna.appendChild(divHora);
    }

    // Generar horas (7:00 a 21:00) en columna final
    for (let h = 7; h <= 21; h++) {
        const divHora = document.createElement('div');
        divHora.className = 'hora-fin';
        divHora.innerText = (h < 10 ? '0' : '') + h + ":00";
        horasColumnaFin.appendChild(divHora);
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

        // Actualizar número de aula en los headers de las columnas de horas
        const aulaSeleccionada = document.getElementById('select-aula');
        const aulaTexto = aulaSeleccionada.options[aulaSeleccionada.selectedIndex].text;
        const aulaHeaderInicio = document.getElementById('aula-header-inicio');
        const aulaHeaderFin = document.getElementById('aula-header-fin');
        if (aulaHeaderInicio) aulaHeaderInicio.textContent = aulaTexto;
        if (aulaHeaderFin) aulaHeaderFin.textContent = aulaTexto;

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
        
        // ✅ Reinicializar iconos de Lucide después de mostrar
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

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

                    // ✅ SOLUCIÓN: Solo mostrar requerimientos si existen
                    const requerimientosHTML = r.requerimientos && r.requerimientos.length > 0 
                        ? `<div class="req">${r.requerimientos.join(', ')}</div>` 
                        : '';

                    const requerimientosHTMLNormal = r.requerimientos && r.requerimientos.length > 0 
                        ? `<div style="font-size: 10px; background: rgba(255, 255, 255, 0.15); padding: 3px 5px; border-radius: 3px; margin-top: 4px; font-weight: 500;">${r.requerimientos.join(', ')}</div>` 
                        : '';

                    if (duracionHoras <= 1.5) {
                        div.innerHTML = `
                            <div class="reserva-compacta">
                                <div class="fila font-bold">${r.docente}</div>
                                <div class="fila">${r.catedra}</div>
                                ${requerimientosHTML}
                            </div>
                        `;
                    } else {
                        div.innerHTML = `
                            <div class="reserva-normal">
                                <div class="font-bold">${r.docente}</div>
                                <div>${r.catedra}</div>
                                ${requerimientosHTMLNormal}
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

    // ✅ FUNCIONALIDAD DE DESCARGA CON HTML-TO-IMAGE
    const btnDescargar = document.getElementById('btn-descargar');
    
    if (btnDescargar) {
        btnDescargar.addEventListener('click', function() {
            console.log('🖼️ Botón descargar clickeado');
            
            if (typeof htmlToImage === 'undefined') {
                console.error('❌ htmlToImage no está disponible');
                alert('Error: La librería de captura de pantalla no se cargó correctamente. Por favor, recarga la página.');
                return;
            }
            
            const calendarioContainer = document.getElementById('calendario-container');
            if (!calendarioContainer) {
                alert('Error: No se encontró el calendario para capturar.');
                return;
            }
            
            const aulaSeleccionada = document.getElementById('select-aula');
            const aulaTexto = aulaSeleccionada.options[aulaSeleccionada.selectedIndex].text;
            const semanaTexto = `${fechaInicio.textContent} al ${fechaFin.textContent}`;
            
            console.log('📸 Iniciando captura...', { aulaTexto, semanaTexto });
            
            btnDescargar.disabled = true;
            const textoOriginal = btnDescargar.innerHTML;
            btnDescargar.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Generando...';
            
            // ✅ APLICAR ESTILOS TEMPORALES PARA IMPRESIÓN (TEXTO MÁS GRANDE)
            const elementosParaAumentar = {
                '.hora': { fontSize: '14px' }, // Era 11px
                '.hora-fin': { fontSize: '14px' }, // Columna final
                '.dia-nombre': { fontSize: '16px', fontWeight: '700' }, // Era 13px
                '.dia-fecha': { fontSize: '13px' }, // Era 11px
                '.reserva': { fontSize: '13px', padding: '8px' }, // Era 10px y 5px
                '.reserva .font-bold': { fontSize: '14px' }, // Nombres docentes
                '.reserva-compacta .fila': { fontSize: '12px', marginBottom: '3px' },
                '.reserva-compacta .req': { fontSize: '11px' }, // Era 9px
                '.reserva-normal > div': { fontSize: '13px', marginBottom: '4px' }
            };
            
            // Guardar estilos originales y aplicar nuevos
            const estilosOriginales = {};
            Object.keys(elementosParaAumentar).forEach(selector => {
                const elementos = calendarioContainer.querySelectorAll(selector);
                estilosOriginales[selector] = [];
                
                elementos.forEach((el, index) => {
                    estilosOriginales[selector][index] = {
                        fontSize: el.style.fontSize,
                        padding: el.style.padding,
                        fontWeight: el.style.fontWeight,
                        marginBottom: el.style.marginBottom
                    };
                    
                    // Aplicar nuevos estilos
                    Object.keys(elementosParaAumentar[selector]).forEach(prop => {
                        el.style[prop] = elementosParaAumentar[selector][prop];
                    });
                });
            });
            
            // Esperar un momento para que se apliquen los estilos
            setTimeout(() => {
                // ✅ Usar html-to-image con mayor calidad
                htmlToImage.toPng(calendarioContainer, {
                    quality: 1.0,
                    pixelRatio: 3, // Aumentado a 3x para mejor calidad de impresión
                    backgroundColor: '#1e293b'
                })
                .then(function(dataUrl) {
                    console.log('✅ Imagen generada correctamente');
                    
                    // RESTAURAR ESTILOS ORIGINALES
                    Object.keys(estilosOriginales).forEach(selector => {
                        const elementos = calendarioContainer.querySelectorAll(selector);
                        elementos.forEach((el, index) => {
                            if (estilosOriginales[selector][index]) {
                                Object.keys(estilosOriginales[selector][index]).forEach(prop => {
                                    el.style[prop] = estilosOriginales[selector][index][prop];
                                });
                            }
                        });
                    });
                    
                    // Crear enlace de descarga
                    const link = document.createElement('a');
                    const nombreArchivo = `Agenda_${aulaTexto.replace(/\s+/g, '_')}_${semanaTexto.replace(/\//g, '-').replace(/\s+/g, '_')}.png`;
                    link.download = nombreArchivo;
                    link.href = dataUrl;
                    link.click();
                    
                    console.log('💾 Archivo descargado:', nombreArchivo);
                    
                    // Restaurar botón
                    btnDescargar.disabled = false;
                    btnDescargar.innerHTML = textoOriginal;
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                })
                .catch(function(error) {
                    console.error('❌ Error al generar imagen:', error);
                    
                    // RESTAURAR ESTILOS ORIGINALES en caso de error
                    Object.keys(estilosOriginales).forEach(selector => {
                        const elementos = calendarioContainer.querySelectorAll(selector);
                        elementos.forEach((el, index) => {
                            if (estilosOriginales[selector][index]) {
                                Object.keys(estilosOriginales[selector][index]).forEach(prop => {
                                    el.style[prop] = estilosOriginales[selector][index][prop];
                                });
                            }
                        });
                    });
                    
                    alert('Error al generar la imagen: ' + error.message + '\n\nIntenta actualizar la página.');
                    
                    // Restaurar botón
                    btnDescargar.disabled = false;
                    btnDescargar.innerHTML = textoOriginal;
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                });
            }, 200); // Esperar a que se apliquen los estilos
        });
        
        console.log('✅ Event listener de descarga agregado');
    } else {
        console.error('❌ No se encontró el botón de descarga');
    }
});