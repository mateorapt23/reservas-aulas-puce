from django.urls import path
from .views import (
    nueva_reserva,
    guardar_reserva,
    api_agenda_aula,
    lista_reservas,
    update_reserva,
    delete_reservas,
)
from . import views
from reservas import views



app_name = 'reservas'

urlpatterns = [
    path('nueva/', views.nueva_reserva, name='nueva_reserva'),
    path('guardar/', views.guardar_reserva, name='guardar_reserva'),
    path('api/agenda-aula/', views.api_agenda_aula, name='api_agenda_aula'),
    path("lista/", views.lista_reservas, name="lista_reservas"),
    path('update/<int:id>/', update_reserva, name='update_reserva'),
    path('delete/', delete_reservas, name='delete_reservas'),
    
   
]