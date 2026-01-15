from django.urls import path
from .views import requerimientos

urlpatterns = [
    path('requerimientos/', requerimientos, name='requerimientos'),
]