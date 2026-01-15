from django.urls import path
from .views import nueva_reserva
from . import views
from reservas import views



app_name = 'reservas'

urlpatterns = [
    path('nueva/', nueva_reserva, name='nueva_reserva'),
    path('agenda-por-aula/', views.agenda_por_aula, name='agenda_por_aula'),
    
]