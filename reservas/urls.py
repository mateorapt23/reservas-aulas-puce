from django.urls import path
from django.contrib.auth.decorators import login_required
from . import views

app_name = 'reservas'

urlpatterns = [
    path('nueva/', login_required(views.nueva_reserva), name='nueva_reserva'),
    path('guardar/', login_required(views.guardar_reserva), name='guardar_reserva'),
    path('api/agenda-aula/', login_required(views.api_agenda_aula), name='api_agenda_aula'),  # ✅ Corregido
    path('lista/', login_required(views.lista_reservas), name='lista_reservas'),
    path('update/<int:id>/', login_required(views.update_reserva), name='update_reserva'),
    path('delete/', login_required(views.delete_reservas), name='delete_reservas'),
]