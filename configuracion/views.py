from django.shortcuts import render
from .models import Requerimiento, Catedra, Aula
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse

def requerimientos(request):
    q = request.GET.get('q', '')
    order = request.GET.get('order', 'asc')

    requerimientos = Requerimiento.objects.all()

    # BÚSQUEDA
    if q:
        requerimientos = requerimientos.filter(nombre__icontains=q)

    # ORDEN
    if order == 'desc':
        requerimientos = requerimientos.order_by('-nombre')
    else:
        requerimientos = requerimientos.order_by('nombre')

    return render(request, 'configuracion/requerimientos.html', {
        'requerimientos': requerimientos,
        'q': q,
        'order': order,
    })

def crear_requerimiento(request):
    if request.method == "POST":
        nombre = request.POST.get("nombre")
        if nombre:
            Requerimiento.objects.create(nombre=nombre)
    return HttpResponse(status=200)


def editar_requerimiento(request, id):
    if request.method == "POST":
        try:
            requerimiento = get_object_or_404(Requerimiento, id=id)
            nombre = request.POST.get("nombre")
            if nombre:
                requerimiento.nombre = nombre
                requerimiento.save()
                return JsonResponse({'success': True})
            return JsonResponse({'success': False, 'message': 'Nombre vacío'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})

def eliminar_requerimiento(request, id):
    if request.method == "POST":
        try:
            requerimiento = get_object_or_404(Requerimiento, id=id)
            requerimiento.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})

def catedras(request):
    q = request.GET.get("q", "")
    order = request.GET.get("order", "asc")

    catedras = Catedra.objects.all()

    if q:
        catedras = catedras.filter(nombre__icontains=q)

    if order == "desc":
        catedras = catedras.order_by("-nombre")
    else:
        catedras = catedras.order_by("nombre")

    context = {
        "catedras": catedras,
        "q": q,
        "order": order
    }

    return render(request, "configuracion/catedras.html", context)


def crear_catedra(request):
    if request.method == "POST":
        nombre = request.POST.get("nombre")
        if nombre:
            Catedra.objects.create(nombre=nombre)
    return HttpResponse(status=200)


def editar_catedra(request, id):
    if request.method == "POST":
        try:
            catedra = get_object_or_404(Catedra, id=id)
            nombre = request.POST.get("nombre")
            if nombre:
                catedra.nombre = nombre
                catedra.save()
                return JsonResponse({'success': True})
            return JsonResponse({'success': False, 'message': 'Nombre vacío'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})

def eliminar_catedra(request, id):
    if request.method == "POST":
        try:
            catedra = get_object_or_404(Catedra, id=id)
            catedra.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})



def aulas(request):
    q = request.GET.get("q", "")
    order = request.GET.get("order", "asc")

    aulas = Aula.objects.all()

    if q:
        aulas = aulas.filter(numero__icontains=q)

    if order == "desc":
        aulas = aulas.order_by("-numero")
    else:
        aulas = aulas.order_by("numero")

    context = {
        "aulas": aulas,
        "requerimientos": Requerimiento.objects.all(),
        "q": q,
        "order": order
    }

    return render(request, "configuracion/aulas.html", context)

def crear_aula(request):
    if request.method == "POST":
        numero = request.POST.get("numero")
        capacidad = request.POST.get("capacidad")
        requerimientos = request.POST.getlist("requerimientos[]")

        if numero and capacidad:
            aula = Aula.objects.create(
                numero=numero,
                capacidad=capacidad
            )
            aula.requerimientos.set(requerimientos)

    return HttpResponse(status=200)

def editar_aula(request, id):
    aula = get_object_or_404(Aula, id=id)

    if request.method == "POST":
        try:
            aula.numero = request.POST.get("numero")
            aula.capacidad = request.POST.get("capacidad")
            requerimientos = request.POST.getlist("requerimientos[]")

            aula.save()
            aula.requerimientos.set(requerimientos)
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})

def eliminar_aula(request, id):
    if request.method == "POST":
        try:
            aula = get_object_or_404(Aula, id=id)
            aula.delete()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})

@require_POST
def eliminar_requerimientos_masivo(request):
    ids = request.POST.getlist('ids[]')
    try:
        Requerimiento.objects.filter(id__in=ids).delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@require_POST
def eliminar_catedras_masivo(request):
    ids = request.POST.getlist('ids[]')
    try:
        Catedra.objects.filter(id__in=ids).delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@require_POST
def eliminar_aulas_masivo(request):
    ids = request.POST.getlist('ids[]')
    try:
        Aula.objects.filter(id__in=ids).delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})