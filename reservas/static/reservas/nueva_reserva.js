document.addEventListener('DOMContentLoaded', () => {

    const tipoRadios = document.querySelectorAll('input[name="tipo"]');
    const finWrapper = document.getElementById('fin-semestre-wrapper');
    const finInput = document.getElementById('fin_semestre');
    const fechaInput = document.getElementById('fecha');

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

    // AGENDA
    document.querySelectorAll('.ver-agenda-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const aulaId = btn.dataset.aula;
            const fecha = fechaInput.value;

            if (!fecha) {
                alert('Selecciona una fecha primero');
                return;
            }

            fetch(`/reservas/agenda/${aulaId}/?fecha=${fecha}`)
                .then(res => res.text())
                .then(html => {
                    const cont = document.getElementById(`agenda-aula-${aulaId}`);
                    cont.innerHTML = html;
                    cont.classList.remove('hidden');
                });
        });
    });

});

document.addEventListener("DOMContentLoaded", function() {
    const agendaContainer = document.getElementById("agenda-container");
    const closeBtn = document.getElementById("close-agenda");

    document.querySelectorAll(".btn-ver-agenda").forEach(button => {
        button.addEventListener("click", async (e) => {
            const aulaId = e.currentTarget.dataset.aula;
            const fecha = document.querySelector("input[name='fecha']").value;

            if (!fecha) return alert("Selecciona una fecha primero");

            // AJAX para traer la agenda
            const response = await fetch(`/reservas/agenda/${aulaId}/?fecha=${fecha}`);
            if (response.ok) {
                const html = await response.text();
                agendaContainer.innerHTML = html;
                agendaContainer.classList.remove("hidden");
            } else {
                alert("Error al cargar la agenda");
            }
        });
    });

    closeBtn.addEventListener("click", () => {
        agendaContainer.classList.add("hidden");
    });
});