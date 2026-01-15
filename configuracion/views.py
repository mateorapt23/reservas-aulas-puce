from django.shortcuts import render

def requerimientos(request):
    return render(request, 'configuracion/requerimientos.html')

def catedras(request):
    return render(request, 'configuracion/catedras.html')

def aulas(request):
    return render(request, 'configuracion/aulas.html')