from django.contrib import admin
from .models import Reserva

@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = (
        "docente",
        "catedra",
        "aula",
        "fecha",
        "hora_inicio",
        "hora_fin",
        "tipo",
    )
    list_filter = ("fecha", "tipo", "aula")
    search_fields = ("docente",)