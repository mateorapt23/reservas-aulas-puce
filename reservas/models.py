from django.db import models
from configuracion.models import Aula, Catedra, Requerimiento

class Reserva(models.Model):
    OCASIONAL = 'ocasional'
    SEMESTRAL = 'semestral'

    TIPO_CHOICES = [
        (OCASIONAL, 'Ocasional'),
        (SEMESTRAL, 'Semestral'),
    ]

    docente = models.CharField(max_length=100)
    catedra = models.ForeignKey(Catedra, on_delete=models.CASCADE)
    aula = models.ForeignKey(Aula, on_delete=models.CASCADE)

    requerimientos = models.ManyToManyField(Requerimiento)

    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    fecha_fin_semestre = models.DateField(null=True, blank=True)