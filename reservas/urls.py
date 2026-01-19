from django.urls import path
from .views import nueva_reserva
from . import views
from reservas import views



app_name = 'reservas'

urlpatterns = [
    path('nueva/', views.nueva_reserva, name='nueva_reserva'),
    path('guardar/', views.guardar_reserva, name='guardar_reserva'),
    path('api/agenda-aula/', views.api_agenda_aula, name='api_agenda_aula'),
   
]