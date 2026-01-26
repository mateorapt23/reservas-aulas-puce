from django.shortcuts import render, redirect, get_object_or_404
from configuracion.models import Aula, Catedra, Requerimiento
from reservas.models import Reserva
from datetime import date, datetime, timedelta, time
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Q, Count
from django.template.loader import render_to_string
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

horas = []
for h in range(7, 22):
    horas.append(f"{h:02d}:00")
    horas.append(f"{h:02d}:30")

context = {
    "horas": horas,
}

@login_required
def nueva_reserva(request):
    catedras = Catedra.objects.all()
    requerimientos = Requerimiento.objects.all()

    aulas_filtradas = []
    reservas_aula = []
    req_ids = []

    if request.method == "POST":
        docente = request.POST.get('docente')
        catedra_id = request.POST.get('catedra')
        fecha = request.POST.get('fecha')
        hora_inicio = request.POST.get('hora_inicio')
        hora_fin = request.POST.get('hora_fin')
        tipo = request.POST.get('tipo')
        fin_semestre = request.POST.get('fin_semestre')

        req_ids = request.POST.getlist('requerimientos')

        # NUEVA LÓGICA DE FILTRADO
        # 1. Obtener todas las aulas
        todas_las_aulas = Aula.objects.all()
        
        # 2. Si hay requerimientos seleccionados, clasificar las aulas
        if req_ids:
            aulas_validas = []
            
            for aula in todas_las_aulas:
                # Contar cuántos de los requerimientos solicitados tiene el aula
                reqs_del_aula = set(aula.requerimientos.values_list('id', flat=True))
                reqs_solicitados = set(int(req_id) for req_id in req_ids)
                
                coincidencias = len(reqs_del_aula.intersection(reqs_solicitados))
                total_reqs_aula = len(reqs_del_aula)
                
                # 🔥 FILTRAR SOLO:
                # - Aulas con TODOS los requerimientos
                # - Aulas con ALGUNOS requerimientos (al menos 1)
                # - Aulas SIN NINGÚN requerimiento (vacías)
                # ❌ NO incluir aulas que tienen requerimientos pero ninguno coincide
                
                if coincidencias > 0 or total_reqs_aula == 0:
                    # Verificar choque de horario
                    choque = Reserva.objects.filter(
                        aula=aula,
                        fecha=fecha,
                        hora_inicio__lt=hora_fin,
                        hora_fin__gt=hora_inicio
                    ).exists()
                    
                    aula.choque = choque
                    aula.coincidencias = coincidencias
                    aula.tiene_todos = coincidencias == len(reqs_solicitados)
                    aula.tiene_algunos = coincidencias > 0 and not aula.tiene_todos
                    aula.sin_requerimientos = total_reqs_aula == 0
                    
                    aulas_validas.append(aula)
            
            # Ordenar: primero TODOS, luego ALGUNOS, luego SIN REQUERIMIENTOS
            aulas_filtradas = sorted(
                aulas_validas,
                key=lambda a: (
                    not a.tiene_todos,           # False (tiene todos) va primero
                    not a.tiene_algunos,         # False (tiene algunos) va segundo
                    not a.sin_requerimientos,    # False (sin reqs) va tercero
                    a.choque                     # Sin choque primero
                )
            )
        else:
            # Si no hay requerimientos seleccionados, mostrar todas las aulas
            for aula in todas_las_aulas:
                choque = Reserva.objects.filter(
                    aula=aula,
                    fecha=fecha,
                    hora_inicio__lt=hora_fin,
                    hora_fin__gt=hora_inicio
                ).exists()
                
                aula.choque = choque
                aula.coincidencias = 0
                aula.tiene_todos = False
                aula.tiene_algunos = False
                aula.sin_requerimientos = aula.requerimientos.count() == 0
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
        'horas': horas,
    }

    return render(request, 'reservas/nueva_reserva.html', context)

@login_required
def guardar_reserva(request):
    if request.method == "POST":
        aula_id = request.POST.get("aula_id")
        docente = request.POST.get("docente")
        catedra_id = request.POST.get("catedra")
        fecha_str = request.POST.get("fecha")
        hora_inicio = request.POST.get("hora_inicio")
        hora_fin = request.POST.get("hora_fin")
        tipo = request.POST.get("tipo")
        fin_semestre_str = request.POST.get("fin_semestre")
        req_ids = request.POST.getlist("requerimientos")

        aula = get_object_or_404(Aula, id=aula_id)
        catedra = get_object_or_404(Catedra, id=catedra_id)

        # Parsear fechas
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
                fecha_actual += timedelta(days=7)

        # Validar choques
        choques = []
        for f in fechas_a_reservar:
            choque = Reserva.objects.filter(
                aula=aula,
                fecha=f,
                hora_inicio__lt=hora_fin,
                hora_fin__gt=hora_inicio
            ).exists()
            if choque:
                choques.append(f.strftime('%d/%m/%Y'))

        if choques:
            msg = f"El aula ya está reservada en las siguientes fechas: {', '.join(choques)}."
            messages.error(request, msg)
            return redirect("reservas:nueva_reserva")

        # 🔥 ALIMENTAR EL AULA CON LOS REQUERIMIENTOS DE ESTA RESERVA
        if req_ids:
            # Obtener los requerimientos actuales del aula
            reqs_actuales = set(aula.requerimientos.values_list('id', flat=True))
            reqs_nuevos = set(int(req_id) for req_id in req_ids)
            
            # Agregar solo los que no existen (evitar duplicados)
            reqs_a_agregar = reqs_nuevos - reqs_actuales
            
            if reqs_a_agregar:
                for req_id in reqs_a_agregar:
                    aula.requerimientos.add(req_id)
                aula.save()

        # Crear las reservas
        for f in fechas_a_reservar:
            reserva = Reserva.objects.create(
                docente=docente,
                catedra=catedra,
                aula=aula,
                fecha=f,
                hora_inicio=hora_inicio,
                hora_fin=hora_fin,
                tipo=tipo,
                fecha_fin_semestre=fin_semestre if tipo == "semestral" else None
            )
            reserva.requerimientos.set(req_ids)
            reserva.save()

        # Mensaje de éxito personalizado
        total_reservas = len(fechas_a_reservar)
        reqs_agregados = len(reqs_nuevos - reqs_actuales) if req_ids else 0
        
        msg = f"✅ {total_reservas} reserva(s) creada(s) correctamente."
        if reqs_agregados > 0:
            msg += f" Se agregaron {reqs_agregados} nuevo(s) requerimiento(s) al Aula {aula.numero}."
        
        messages.success(request, msg)
        return redirect("reservas:nueva_reserva")

    return redirect("reservas:nueva_reserva")

@login_required
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
    "tipo": "tipo",
    "-tipo": "-tipo",
}

@login_required
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

    catedras = Catedra.objects.all().order_by('nombre')
    aulas = Aula.objects.all().order_by('numero')

    context = {
        "reservas": reservas,
        "tipo_actual": tipo,
        "order": order,
        "q": q,
        "catedras": catedras,
        "aulas": aulas,
    }

    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return render(request, 'reservas/lista_reservas_tabla.html', context)

    return render(request, 'reservas/lista_reservas.html', context)

@login_required
@require_POST
def update_reserva(request, id):
    reserva = get_object_or_404(Reserva, pk=id)

    try:
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

        if reserva.hora_inicio >= reserva.hora_fin:
            return JsonResponse({
                'success': False, 
                'message': 'La hora de fin debe ser posterior a la hora de inicio'
            }, status=400)

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

@login_required
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

