from django.shortcuts import render, get_object_or_404
from configuracion.models import Aula, Catedra, Requerimiento
from reservas.models import Reserva
from datetime import date, datetime

def nueva_reserva(request):
    catedras = Catedra.objects.all()
    requerimientos = Requerimiento.objects.all()

    aulas_filtradas = []
    reservas_aula = []

    req_ids = []  # 👈 MUY IMPORTANTE (inicializar)

    if request.method == "POST":
        docente = request.POST.get('docente')
        catedra_id = request.POST.get('catedra')
        fecha = request.POST.get('fecha')
        hora_inicio = request.POST.get('hora_inicio')
        hora_fin = request.POST.get('hora_fin')
        tipo = request.POST.get('tipo')
        fin_semestre = request.POST.get('fin_semestre')

        req_ids = request.POST.getlist('requerimientos')

        # Filtrar aulas que tengan TODOS los requerimientos
        aulas = Aula.objects.all()
        for req_id in req_ids:
            aulas = aulas.filter(requerimientos=req_id)

        for aula in aulas.distinct():
            choque = Reserva.objects.filter(
                aula=aula,
                fecha=fecha,
                hora_inicio__lt=hora_fin,
                hora_fin__gt=hora_inicio
            ).exists()

            aula.choque = choque
            aulas_filtradas.append(aula)

        # Agenda preview del primer aula
        if aulas_filtradas:
            reservas_aula = Reserva.objects.filter(
                aula=aulas_filtradas[0],
                fecha=fecha
            ).order_by('hora_inicio')

    context = {
        'catedras': catedras,
        'requerimientos': requerimientos,
        'aulas': aulas_filtradas,
        'reservas_aula': reservas_aula,
        'req_seleccionados': req_ids,  # 👈 ahora SIEMPRE existe
    }

    return render(request, 'reservas/nueva_reserva.html', context)

def agenda_por_aula(request):
    # Por ahora no enviamos datos, todo se genera en JS
    return render(request, 'reservas/agenda_por_aula.html', {})