from django.urls import path
from django.contrib.auth.decorators import login_required
from . import views

app_name = 'calendario'

urlpatterns = [
    path('agenda-por-aula/', login_required(views.agenda_por_aula), name='agenda_por_aula'),
    path('api/reservas/', login_required(views.reservas_por_aula), name='reservas_por_aula'),
]