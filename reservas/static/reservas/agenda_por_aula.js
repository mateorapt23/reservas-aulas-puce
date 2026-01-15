const horasColumna = document.getElementById('col-horas');
const reservasColumna = document.getElementById('col-reservas');
const btnFiltrar = document.getElementById('btn-filtrar');

// Generar horas de 7:00 a 21:00
for(let h=7; h<=21; h++){
    const divHora = document.createElement('div');
    divHora.className = 'hora';
    divHora.innerText = (h<10?'0':'')+h+":00";
    horasColumna.appendChild(divHora);
}

// Función que genera bloques de reservas hardcodeadas
function cargarReservas(){
    // Limpiar antes
    reservasColumna.innerHTML = '';

    // Ejemplo de reservas hardcodeadas
    const reservas = [
        { docente: "Juan Pérez", catedra: "Matemáticas", aula: "101", requerimientos: "Proyector", tipo: "semestral", inicio: 8, fin: 10 },
        { docente: "Ana Gómez", catedra: "Física", aula: "101", requerimientos: "Laptop", tipo: "ocasional", inicio: 13, fin: 15 },
        { docente: "Luis Torres", catedra: "Historia", aula: "101", requerimientos: "Pizarra", tipo: "semestral", inicio: 16, fin: 18 },
    ];

    reservas.forEach(r => {
        const div = document.createElement('div');
        div.className = 'reserva ' + r.tipo;
        div.style.top = ((r.inicio-7)*60) + 'px';   // 1 hora = 60px
        div.style.height = ((r.fin - r.inicio)*60) + 'px';
        div.innerHTML = `
            <b>${r.docente}</b><br>
            ${r.catedra} | Aula ${r.aula}<br>
            Requerimientos: ${r.requerimientos}<br>
            Tipo: ${r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1)}
        `;
        reservasColumna.appendChild(div);
    });
}

// Botón filtrar
btnFiltrar.addEventListener('click', () => {
    cargarReservas();
});