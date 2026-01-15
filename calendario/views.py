from django.shortcuts import render
from configuracion.models import Aula
from reservas.models import Reserva

def agenda_por_aula(request):
    return render(request, 'calendario/agenda_por_aula.html')