from django.shortcuts import render
from reservas.models import Reserva
from configuracion.models import Aula

def agenda_aula(request):
    aula_id = request.GET.get('aula_id')
    fecha = request.GET.get('fecha')

    reservas = Reserva.objects.filter(
        aula_id=aula_id,
        fecha=fecha
    ).order_by('hora_inicio')

    return render(request, 'calendario/agenda_fragment.html', {
        'reservas': reservas
    })