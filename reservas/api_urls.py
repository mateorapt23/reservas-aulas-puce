"""
URLs para la API de consulta de disponibilidad
"""
from django.urls import path
from . import api

urlpatterns = [
    path('consultar-disponibilidad/', api.consultar_disponibilidad, name='api_consultar_disponibilidad'),
    path('listar-requerimientos/', api.listar_requerimientos, name='api_listar_requerimientos'),
]