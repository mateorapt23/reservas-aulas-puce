from django.urls import path
from .views import agenda_aula

urlpatterns = [
    path('agenda-aula/', agenda_aula, name='agenda_aula'),
]