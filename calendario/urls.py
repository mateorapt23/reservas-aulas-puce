from django.urls import path
from . import views

app_name = 'calendario'

urlpatterns = [
    path('agenda-por-aula/', views.agenda_por_aula, name='agenda_por_aula'),
    path('api/reservas/', views.reservas_por_aula, name='reservas_por_aula'),
]