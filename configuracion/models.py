from django.db import models

class Requerimiento(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre


class Catedra(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre


class Aula(models.Model):
    numero = models.CharField(max_length=10, unique=True)
    capacidad = models.PositiveIntegerField()
    requerimientos = models.ManyToManyField(Requerimiento)

    def __str__(self):
        return f"Aula {self.numero}"