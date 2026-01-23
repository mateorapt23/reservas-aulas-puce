from django.shortcuts import render, redirect, get_object_or_404
from configuracion.models import Aula, Catedra, Requerimiento
from reservas.models import Reserva
from datetime import date, datetime
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from datetime import date, datetime, timedelta, time
from django.db.models import Q
from django.template.loader import render_to_string
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt

horas = []
for h in range(7, 22):  # ejemplo 07:00 - 22:30
    horas.append(f"{h:02d}:00")
    horas.append(f"{h:02d}:30")

context = {
    "horas": horas,
    # otros datos
}


def nueva_reserva(request):
    catedras = Catedra.objects.all()
    requerimientos = Requerimiento.objects.all()

    aulas_filtradas = []
    reservas_aula = []

    req_ids = []  # 👈 MUY IMPORTANTE (inicializar)

    if request.method == "POST":
        docente = request.POST.get('docente')
        catedra_id = request.POST.get('catedra')
        fecha = request.POST.get('fecha')
        hora_inicio = request.POST.get('hora_inicio')
        hora_fin = request.POST.get('hora_fin')
        tipo = request.POST.get('tipo')
        fin_semestre = request.POST.get('fin_semestre')

        req_ids = request.POST.getlist('requerimientos')

        # Filtrar aulas que tengan TODOS los requerimientos
        aulas = Aula.objects.all()
        for req_id in req_ids:
            aulas = aulas.filter(requerimientos=req_id)

        for aula in aulas.distinct():
            choque = Reserva.objects.filter(
                aula=aula,
                fecha=fecha,
                hora_inicio__lt=hora_fin,
                hora_fin__gt=hora_inicio
            ).exists()

            aula.choque = choque
            aulas_filtradas.append(aula)

        # Agenda preview del primer aula
        if aulas_filtradas:
            reservas_aula = Reserva.objects.filter(
                aula=aulas_filtradas[0],
                fecha=fecha
            ).order_by('hora_inicio')

    context = {
        'catedras': catedras,
        'requerimientos': requerimientos,
        'aulas': aulas_filtradas,
        'reservas_aula': reservas_aula,
        'req_seleccionados': req_ids,
        'horas': horas,  # 👈 ESTA LÍNEA
    }

    return render(request, 'reservas/nueva_reserva.html', context)

def guardar_reserva(request):
    if request.method == "POST":
        aula_id = request.POST.get("aula_id")
        docente = request.POST.get("docente")
        catedra_id = request.POST.get("catedra")
        fecha_str = request.POST.get("fecha")  # 'YYYY-MM-DD'
        hora_inicio = request.POST.get("hora_inicio")
        hora_fin = request.POST.get("hora_fin")
        tipo = request.POST.get("tipo")
        fin_semestre_str = request.POST.get("fin_semestre")
        req_ids = request.POST.getlist("requerimientos")

        aula = get_object_or_404(Aula, id=aula_id)
        catedra = get_object_or_404(Catedra, id=catedra_id)

        # Parsear fechas a date objects
        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            if tipo == "semestral" and fin_semestre_str:
                fin_semestre = datetime.strptime(fin_semestre_str, '%Y-%m-%d').date()
                if fin_semestre < fecha:
                    messages.error(request, "La fecha fin de semestre debe ser posterior a la fecha inicial.")
                    return redirect("reservas:nueva_reserva")
            else:
                fin_semestre = None
        except ValueError:
            messages.error(request, "Formato de fecha inválido.")
            return redirect("reservas:nueva_reserva")

        # Lista de fechas a reservar
        fechas_a_reservar = []
        if tipo == "ocasional":
            fechas_a_reservar = [fecha]
        elif tipo == "semestral":
            fecha_actual = fecha
            while fecha_actual <= fin_semestre:
                fechas_a_reservar.append(fecha_actual)
                fecha_actual += timedelta(days=7)  # Suma 7 días (repetición semanal)

        # Validar choques en TODAS las fechas (seguridad)
        choques = []
        for f in fechas_a_reservar:
            choque = Reserva.objects.filter(
                aula=aula,
                fecha=f,
                hora_inicio__lt=hora_fin,
                hora_fin__gt=hora_inicio
            ).exists()
            if choque:
                choques.append(f.strftime('%d/%m/%Y'))  # Guardar fechas con choque para mensaje

        if choques:
            msg = f"El aula ya está reservada en las siguientes fechas: {', '.join(choques)}."
            messages.error(request, msg)
            return redirect("reservas:nueva_reserva")

        # Si no hay choques, crear las reservas
        for f in fechas_a_reservar:
            reserva = Reserva.objects.create(
                docente=docente,
                catedra=catedra,
                aula=aula,
                fecha=f,  # ← Fecha específica para cada repetición
                hora_inicio=hora_inicio,
                hora_fin=hora_fin,
                tipo=tipo,
                fecha_fin_semestre=fin_semestre if tipo == "semestral" else None
            )
            reserva.requerimientos.set(req_ids)
            reserva.save()

        messages.success(request, "Reserva(s) creada(s) correctamente.")
        return redirect("reservas:nueva_reserva")

    return redirect("reservas:nueva_reserva")

def api_agenda_aula(request):
    aula_id = request.GET.get('aula')
    fecha = request.GET.get('fecha')

    reservas = Reserva.objects.filter(
        aula_id=aula_id,
        fecha=fecha
    ).order_by('hora_inicio')

    data = []
    for r in reservas:
        data.append({
            'inicio': r.hora_inicio.strftime('%H:%M'),
            'fin': r.hora_fin.strftime('%H:%M'),
            'catedra': r.catedra.nombre,
            'tipo': r.tipo,
        })

    return JsonResponse(data, safe=False)

ORDER_MAP = {
    "docente": "docente",
    "-docente": "-docente",
    "catedra": "catedra__nombre",
    "-catedra": "-catedra__nombre",
    "aula": "aula__numero",
    "-aula": "-aula__numero",
    "fecha": "fecha",
    "-fecha": "-fecha",
    "hora_inicio": "hora_inicio",
    "-hora_inicio": "-hora_inicio",
    "hora_fin": "hora_fin",
    "-hora_fin": "-hora_fin",
    "tipo": "tipo",          # ← agregado para que funcione orden por tipo
    "-tipo": "-tipo",
}


def lista_reservas(request):
    tipo = request.GET.get("tipo", "ocasional")
    q = request.GET.get("q", "")
    order = request.GET.get("order", "fecha")

    reservas = Reserva.objects.select_related(
        "catedra",
        "aula"
    ).filter(tipo=tipo)

    if q:
        reservas = reservas.filter(
            Q(docente__icontains=q) |
            Q(catedra__nombre__icontains=q) |
            Q(aula__numero__icontains=q)
        )

    order_by = ORDER_MAP.get(order, "fecha")
    reservas = reservas.order_by(order_by)

    # 👇 AGREGAR ESTO: Cargar todas las cátedras y aulas para los selects
    catedras = Catedra.objects.all().order_by('nombre')
    aulas = Aula.objects.all().order_by('numero')

    context = {
        "reservas": reservas,
        "tipo_actual": tipo,
        "order": order,
        "q": q,
        "catedras": catedras,  # 👈 Nuevo
        "aulas": aulas,        # 👈 Nuevo
    }

    # Si es AJAX, devolver solo la tabla parcial
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return render(request, 'reservas/lista_reservas_tabla.html', context)

    # Vista normal (página completa)
    return render(request, 'reservas/lista_reservas.html', context)

@require_POST
def update_reserva(request, id):
    reserva = get_object_or_404(Reserva, pk=id)

    try:
        # Actualizar solo si el campo fue enviado
        if 'docente' in request.POST:
            reserva.docente = request.POST.get('docente').strip()
        
        if 'catedra' in request.POST and request.POST.get('catedra'):
            reserva.catedra_id = int(request.POST.get('catedra'))
        
        if 'aula' in request.POST and request.POST.get('aula'):
            reserva.aula_id = int(request.POST.get('aula'))
        
        if 'fecha' in request.POST:
            reserva.fecha = datetime.strptime(request.POST.get('fecha'), '%Y-%m-%d').date()
        
        if 'hora_inicio' in request.POST:
            reserva.hora_inicio = datetime.strptime(request.POST.get('hora_inicio'), '%H:%M').time()
        
        if 'hora_fin' in request.POST:
            reserva.hora_fin = datetime.strptime(request.POST.get('hora_fin'), '%H:%M').time()

        # Validación básica
        if reserva.hora_inicio >= reserva.hora_fin:
            return JsonResponse({
                'success': False, 
                'message': 'La hora de fin debe ser posterior a la hora de inicio'
            }, status=400)

        # Validación de choque (excluyendo la reserva actual)
        choque = Reserva.objects.filter(
            aula=reserva.aula,
            fecha=reserva.fecha,
            hora_inicio__lt=reserva.hora_fin,
            hora_fin__gt=reserva.hora_inicio
        ).exclude(id=reserva.id).exists()

        if choque:
            return JsonResponse({
                'success': False, 
                'message': 'Choque de horario con otra reserva existente'
            }, status=400)

        reserva.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Reserva actualizada correctamente'
        })

    except (ValueError, TypeError) as e:
        return JsonResponse({
            'success': False, 
            'message': f'Error en los datos: {str(e)}'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error inesperado: {str(e)}'
        }, status=500)

@require_POST
def delete_reservas(request):
    ids = request.POST.getlist('ids[]')
    if not ids:
        return JsonResponse({'success': False, 'message': 'No se seleccionaron reservas'}, status=400)
    
    try:
        Reserva.objects.filter(id__in=ids).delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)