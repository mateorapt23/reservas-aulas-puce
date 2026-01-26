from django.shortcuts import render
from configuracion.models import Aula
from reservas.models import Reserva
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required


@login_required
def agenda_por_aula(request):
    aulas = Aula.objects.all().order_by('numero')
    return render(request, 'calendario/agenda_por_aula.html', {
        'aulas': aulas
    })

from django.http import JsonResponse
from reservas.models import Reserva

@login_required
def reservas_por_aula(request):
    aula_id = request.GET.get('aula')
    fecha = request.GET.get('fecha')

    reservas = Reserva.objects.filter(
        aula_id=aula_id,
        fecha=fecha
    ).select_related('catedra', 'aula')

    data = []
    for r in reservas:
        data.append({
            "docente": r.docente,
            "catedra": r.catedra.nombre,
            "aula": r.aula.numero,
            "tipo": r.tipo,
            "hora_inicio": r.hora_inicio.strftime("%H:%M"),
            "hora_fin": r.hora_fin.strftime("%H:%M"),
            "requerimientos": [req.nombre for req in r.requerimientos.all()]
        })

    return JsonResponse(data, safe=False)

