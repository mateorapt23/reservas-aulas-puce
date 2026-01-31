from django.shortcuts import render, redirect, get_object_or_404
from configuracion.models import Aula, Catedra, Requerimiento
from reservas.models import Reserva
from datetime import date, datetime, timedelta, time
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
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
        capacidad_filtro = request.POST.get('capacidad', '').strip()

        # LÓGICA DE FILTRADO
        todas_las_aulas = Aula.objects.all()
        mostrar_aviso_ninguno = False
        
        if req_ids:
            aulas_validas = []       # tienen todos, algunos o están vacías
            aulas_ninguno = []       # tienen reqs pero ninguno coincide (fallback)
            reqs_solicitados = set(int(req_id) for req_id in req_ids)
            
            for aula in todas_las_aulas:
                reqs_del_aula = set(aula.requerimientos.values_list('id', flat=True))
                coincidencias = len(reqs_del_aula.intersection(reqs_solicitados))
                total_reqs_aula = len(reqs_del_aula)
                
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
                aula.ninguno_coincide = total_reqs_aula > 0 and coincidencias == 0
                
                if coincidencias > 0 or total_reqs_aula == 0:
                    aulas_validas.append(aula)
                elif total_reqs_aula > 0 and coincidencias == 0:
                    aulas_ninguno.append(aula)
            
            # Si no hay aulas válidas, usar fallback de "ninguno coincide"
            if not aulas_validas and aulas_ninguno:
                aulas_validas = aulas_ninguno
                mostrar_aviso_ninguno = True
            
            # Ordenar según prioridad
            def sort_key(a):
                if a.tiene_todos:
                    req_priority = 0
                elif a.tiene_algunos:
                    req_priority = 1
                elif a.sin_requerimientos:
                    req_priority = 2
                else:
                    req_priority = 3  # ninguno coincide (fallback)
                
                # Capacidad: si se proporcionó, usar diferencia absoluta como 2da prioridad
                if capacidad_filtro:
                    try:
                        cap_pedida = int(capacidad_filtro)
                        cap_aula = a.capacidad if hasattr(a, 'capacidad') and a.capacidad else 0
                        cap_diff = abs(cap_aula - cap_pedida)
                    except (ValueError, TypeError):
                        cap_diff = 9999
                else:
                    cap_diff = 0
                
                return (req_priority, cap_diff, a.choque)
            
            aulas_filtradas = sorted(aulas_validas, key=sort_key)
        else:
            # Sin requerimientos, mostrar todas las aulas
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
                aula.ninguno_coincide = False
                aulas_filtradas.append(aula)
            
            # Si se proporcionó capacidad, ordenar por proximidad
            if capacidad_filtro:
                try:
                    cap_pedida = int(capacidad_filtro)
                    aulas_filtradas = sorted(
                        aulas_filtradas,
                        key=lambda a: (abs((a.capacidad if hasattr(a, 'capacidad') and a.capacidad else 0) - cap_pedida), a.choque)
                    )
                except (ValueError, TypeError):
                    pass

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
        'mostrar_aviso_ninguno': mostrar_aviso_ninguno if request.method == "POST" else False,
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

        # Generar fechas
        fechas_a_reservar = []
        if tipo == "semestral" and fin_semestre:
            fecha_actual = fecha
            while fecha_actual <= fin_semestre:
                fechas_a_reservar.append(fecha_actual)
                fecha_actual += timedelta(days=7)
        else:
            fechas_a_reservar = [fecha]

        # Validar choque
        choques = []
        for f in fechas_a_reservar:
            if Reserva.objects.filter(
                aula=aula,
                fecha=f,
                hora_inicio__lt=hora_fin,
                hora_fin__gt=hora_inicio
            ).exists():
                choques.append(f.strftime('%d/%m/%Y'))

        if choques:
            msg = f"El aula ya está reservada en las siguientes fechas: {', '.join(choques)}."
            messages.error(request, msg)
            return redirect("reservas:nueva_reserva")


        # 🔥 ALIMENTAR EL AULA CON LOS REQUERIMIENTOS SOLICITADOS
        if req_ids:
            # Obtener los requerimientos actuales del aula
            reqs_actuales_ids = set(aula.requerimientos.values_list('id', flat=True))
            reqs_solicitados_ids = set(int(req_id) for req_id in req_ids)
            
            # Encontrar los requerimientos que el aula NO tiene
            reqs_faltantes = reqs_solicitados_ids - reqs_actuales_ids
            
            # Agregar los requerimientos faltantes al aula
            if reqs_faltantes:
                for req_id in reqs_faltantes:
                    requerimiento = Requerimiento.objects.get(id=req_id)
                    aula.requerimientos.add(requerimiento)
        # Crear reservas
        for f in fechas_a_reservar:
            Reserva.objects.create(
                aula=aula,
                docente=docente,
                catedra=catedra,
                fecha=f,
                hora_inicio=hora_inicio,
                hora_fin=hora_fin,
                tipo=tipo,
                fecha_fin_semestre=fin_semestre if tipo == "semestral" else None
            )

        messages.success(request, f"Reserva(s) guardada(s) correctamente. ({len(fechas_a_reservar)} fecha(s))")
        return redirect("reservas:nueva_reserva")

    return redirect("reservas:nueva_reserva")

@login_required
def api_agenda_aula(request):
    aula_id = request.GET.get('aula_id')
    fecha_str = request.GET.get('fecha')
    
    if not aula_id or not fecha_str:
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)
    
    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        reservas = Reserva.objects.filter(
            aula_id=aula_id,
            fecha=fecha
        ).select_related('catedra').order_by('hora_inicio')
        
        data = []
        for r in reservas:
            # 🔥 NUEVO: Buscar el grupo padre si es semestral
            grupo_padre_id = None
            if r.tipo == 'semestral':
                # Buscar la primera reserva (padre) del grupo
                padre = Reserva.objects.filter(
                    docente=r.docente,
                    catedra=r.catedra,
                    aula=r.aula,
                    hora_inicio=r.hora_inicio,
                    hora_fin=r.hora_fin,
                    tipo='semestral'
                ).order_by('fecha').first()
                
                if padre:
                    grupo_padre_id = padre.id
            
            data.append({
                'id': r.id,  # 🔥 NUEVO: ID de la reserva
                'grupo_padre_id': grupo_padre_id,  # 🔥 NUEVO: ID del grupo padre (si es semestral)
                'docente': r.docente,
                'catedra': r.catedra.nombre,
                'hora_inicio': r.hora_inicio.strftime('%H:%M'),
                'hora_fin': r.hora_fin.strftime('%H:%M'),
                'tipo': r.tipo
            })
        
        return JsonResponse({'reservas': data})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def lista_reservas(request):
    tipo_actual = request.GET.get('tipo', 'ocasional')
    q = request.GET.get('q', '')
    order = request.GET.get('order', '')
    semana_filtro = request.GET.get('semana', '')  # 🔥 Filtro por semana
    
    # Variables para el filtro de semana
    lunes = None
    sabado = None
    
    if semana_filtro:
        try:
            # Convertir fecha a objeto date
            fecha_ref = datetime.strptime(semana_filtro, '%Y-%m-%d').date()
            
            # Calcular lunes y sábado de esa semana
            dia_semana = fecha_ref.weekday()  # 0 = lunes, 6 = domingo
            lunes = fecha_ref - timedelta(days=dia_semana)
            sabado = lunes + timedelta(days=5)
        except ValueError:
            semana_filtro = ''  # Si la fecha es inválida, ignorar el filtro
    
    # NUEVA LÓGICA: Si hay una `reserva_id` en GET, forzar el tipo y buscar
    reserva_id_filtro = request.GET.get('reserva_id', '')
    if reserva_id_filtro:
        try:
            reserva_obj = Reserva.objects.get(id=reserva_id_filtro)
            tipo_actual = reserva_obj.tipo
        except Reserva.DoesNotExist:
            pass
    
    # Base queryset
    reservas_base = Reserva.objects.all().select_related('catedra', 'aula')
    
    # Filtrar por tipo
    reservas_base = reservas_base.filter(tipo=tipo_actual)
    
    # Filtrar por búsqueda
    if q:
        reservas_base = reservas_base.filter(
            Q(docente__icontains=q) |
            Q(catedra__nombre__icontains=q) |
            Q(aula__numero__icontains=q)
        )
    
    # 🔥 Filtrar por semana si está activado
    if lunes and sabado:
        reservas_base = reservas_base.filter(fecha__gte=lunes, fecha__lte=sabado)
    
    # ORDENAMIENTO MÚLTIPLE
    if order:
        order_fields = []
        for field_str in order.split(','):
            field_str = field_str.strip()
            if field_str.startswith('-'):
                field = field_str[1:]
                direction = '-'
            else:
                field = field_str
                direction = ''
            
            if field == 'docente':
                order_fields.append(f'{direction}docente')
            elif field == 'catedra':
                order_fields.append(f'{direction}catedra__nombre')
            elif field == 'aula':
                order_fields.append(f'{direction}aula__numero')
            elif field == 'fecha':
                order_fields.append(f'{direction}fecha')
            elif field == 'hora_inicio':
                order_fields.append(f'{direction}hora_inicio')
            elif field == 'hora_fin':
                order_fields.append(f'{direction}hora_fin')
        
        if order_fields:
            reservas_base = reservas_base.order_by(*order_fields)
    else:
        # Orden por defecto
        reservas_base = reservas_base.order_by('fecha', 'hora_inicio')
    
    # SEPARAR LÓGICA POR TIPO
    if tipo_actual == 'semestral':
        # Agrupar por (docente, cátedra, aula, hora_inicio, hora_fin)
        reservas_agrupadas = []
        padres_procesados = set()
        
        for r in reservas_base:
            # Si esta reserva ya fue procesada como hijo, saltar
            if r.id in padres_procesados:
                continue
            
            # Buscar todas las reservas del mismo grupo
            grupo = Reserva.objects.filter(
                docente=r.docente,
                catedra=r.catedra,
                aula=r.aula,
                hora_inicio=r.hora_inicio,
                hora_fin=r.hora_fin,
                tipo='semestral'
            ).order_by('fecha')
            
            # El padre es la primera del grupo
            padre = grupo.first()
            hijos = list(grupo[1:])  # El resto son hijos
            
            reservas_agrupadas.append({
                'padre': padre,
                'hijos': hijos,
                'total': grupo.count()
            })
            
            # Marcar todas como procesadas
            for res in grupo:
                padres_procesados.add(res.id)
        
        context = {
            'tipo_actual': tipo_actual,
            'reservas_agrupadas': reservas_agrupadas,
            'catedras': Catedra.objects.all(),
            'aulas': Aula.objects.all(),
            'q': q,
            'semana_filtro': semana_filtro,
            'fecha_inicio_semana': lunes.strftime('%d/%m/%Y') if lunes else '',
            'fecha_fin_semana': sabado.strftime('%d/%m/%Y') if sabado else '',
        }
    else:
        # OCASIONALES: Vista normal
        context = {
            'tipo_actual': tipo_actual,
            'reservas': reservas_base,
            'catedras': Catedra.objects.all(),
            'aulas': Aula.objects.all(),
            'q': q,
            'semana_filtro': semana_filtro,
            'fecha_inicio_semana': lunes.strftime('%d/%m/%Y') if lunes else '',
            'fecha_fin_semana': sabado.strftime('%d/%m/%Y') if sabado else '',
        }
    
    
    # 🔥 Si es una petición AJAX, devolver solo la tabla
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'reservas/lista_reservas_tabla.html', context)
    
    return render(request, 'reservas/lista_reservas.html', context)



@login_required
@require_POST
def update_reserva(request, id):
    try:
        reserva = get_object_or_404(Reserva, id=id)
        
        # Obtener el campo que se está editando
        field = request.POST.get('field')
        value = request.POST.get('value')
        
        if not field or value is None:
            return JsonResponse({
                'success': False,
                'message': 'Faltan parámetros'
            }, status=400)
        
        # Validar y actualizar según el campo
        if field == 'docente':
            reserva.docente = value
        
        elif field == 'catedra':
            try:
                catedra = Catedra.objects.get(id=int(value))
                reserva.catedra = catedra
            except (ValueError, Catedra.DoesNotExist):
                return JsonResponse({
                    'success': False,
                    'message': 'Cátedra inválida'
                }, status=400)
        
        elif field == 'aula':
            try:
                nueva_aula = Aula.objects.get(id=int(value))
                # Validar choque de horario
                choque = Reserva.objects.filter(
                    aula=nueva_aula,
                    fecha=reserva.fecha,
                    hora_inicio__lt=reserva.hora_fin,
                    hora_fin__gt=reserva.hora_inicio
                ).exclude(id=reserva.id).exists()
                
                if choque:
                    return JsonResponse({
                        'success': False,
                        'message': 'El aula ya está reservada en ese horario'
                    }, status=400)
                
                reserva.aula = nueva_aula
            except (ValueError, Aula.DoesNotExist):
                return JsonResponse({
                    'success': False,
                    'message': 'Aula inválida'
                }, status=400)
        
        elif field == 'fecha':
            try:
                nueva_fecha = datetime.strptime(value, '%Y-%m-%d').date()
                # Validar choque de horario
                choque = Reserva.objects.filter(
                    aula=reserva.aula,
                    fecha=nueva_fecha,
                    hora_inicio__lt=reserva.hora_fin,
                    hora_fin__gt=reserva.hora_inicio
                ).exclude(id=reserva.id).exists()
                
                if choque:
                    return JsonResponse({
                        'success': False,
                        'message': 'El aula ya está reservada en ese horario'
                    }, status=400)
                
                reserva.fecha = nueva_fecha
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'message': 'Formato de fecha inválido'
                }, status=400)
        
        elif field == 'hora_inicio':
            try:
                nueva_hora = datetime.strptime(value, '%H:%M').time()
                if nueva_hora >= reserva.hora_fin:
                    return JsonResponse({
                        'success': False,
                        'message': 'La hora de inicio debe ser anterior a la hora de fin'
                    }, status=400)
                
                # Validar choque de horario
                choque = Reserva.objects.filter(
                    aula=reserva.aula,
                    fecha=reserva.fecha,
                    hora_inicio__lt=reserva.hora_fin,
                    hora_fin__gt=nueva_hora
                ).exclude(id=reserva.id).exists()
                
                if choque:
                    return JsonResponse({
                        'success': False,
                        'message': 'El aula ya está reservada en ese horario'
                    }, status=400)
                
                reserva.hora_inicio = nueva_hora
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'message': 'Formato de hora inválido'
                }, status=400)
        
        elif field == 'hora_fin':
            try:
                nueva_hora = datetime.strptime(value, '%H:%M').time()
                if nueva_hora <= reserva.hora_inicio:
                    return JsonResponse({
                        'success': False,
                        'message': 'La hora de fin debe ser posterior a la hora de inicio'
                    }, status=400)
                
                # Validar choque de horario
                choque = Reserva.objects.filter(
                    aula=reserva.aula,
                    fecha=reserva.fecha,
                    hora_inicio__lt=nueva_hora,
                    hora_fin__gt=reserva.hora_inicio
                ).exclude(id=reserva.id).exists()
                
                if choque:
                    return JsonResponse({
                        'success': False,
                        'message': 'El aula ya está reservada en ese horario'
                    }, status=400)
                
                reserva.hora_fin = nueva_hora
            except ValueError:
                return JsonResponse({
                    'success': False,
                    'message': 'Formato de hora inválido'
                }, status=400)
        
        else:
            return JsonResponse({
                'success': False,
                'message': 'Campo no válido'
            }, status=400)
        
        reserva.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Reserva actualizada correctamente'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error inesperado: {str(e)}'
        }, status=500)

@login_required
@require_POST
def delete_reservas(request):
    try:
        ids = request.POST.getlist('ids[]')
        
        if not ids:
            return JsonResponse({
                'success': False,
                'message': 'No se especificaron reservas para eliminar'
            }, status=400)
        
        count = Reserva.objects.filter(id__in=ids).delete()[0]
        
        return JsonResponse({
            'success': True,
            'message': f'{count} reserva(s) eliminada(s) correctamente'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al eliminar: {str(e)}'
        }, status=500)

@login_required
@require_POST
def update_grupo_semestral(request):
    try:
        grupo_id = request.POST.get('grupo_id')
        
        if not grupo_id:
            return JsonResponse({
                'success': False,
                'message': 'No se especificó el grupo'
            }, status=400)
        
        # Obtener la reserva padre
        reserva_padre = get_object_or_404(Reserva, id=grupo_id)
        
        # Obtener los campos que se están editando
        nuevo_docente = request.POST.get('docente') if 'docente' in request.POST else None
        nueva_catedra_id = request.POST.get('catedra') if 'catedra' in request.POST else None
        nueva_aula_id = request.POST.get('aula') if 'aula' in request.POST else None
        nueva_hora_inicio = request.POST.get('hora_inicio') if 'hora_inicio' in request.POST else None
        nueva_hora_fin = request.POST.get('hora_fin') if 'hora_fin' in request.POST else None
        nueva_fecha_fin = request.POST.get('fecha_fin_semestre') if 'fecha_fin_semestre' in request.POST else None
        
        # Validaciones
        if nueva_hora_inicio and nueva_hora_fin:
            hora_inicio_obj = datetime.strptime(nueva_hora_inicio, '%H:%M').time()
            hora_fin_obj = datetime.strptime(nueva_hora_fin, '%H:%M').time()
            if hora_inicio_obj >= hora_fin_obj:
                return JsonResponse({
                    'success': False,
                    'message': 'La hora de fin debe ser posterior a la hora de inicio'
                }, status=400)
        
        if nueva_fecha_fin:
            nueva_fecha_obj = datetime.strptime(nueva_fecha_fin, '%Y-%m-%d').date()
            if nueva_fecha_obj < reserva_padre.fecha:
                return JsonResponse({
                    'success': False,
                    'message': 'La fecha fin debe ser posterior a la fecha de inicio'
                }, status=400)
        
        # Buscar TODAS las reservas del mismo grupo (usando los valores ORIGINALES del padre)
        reservas_grupo = Reserva.objects.filter(
            docente=reserva_padre.docente,
            catedra=reserva_padre.catedra,
            aula=reserva_padre.aula,
            hora_inicio=reserva_padre.hora_inicio,
            hora_fin=reserva_padre.hora_fin,
            tipo='semestral'
        ).order_by('fecha')
        
        # 🔥 LÓGICA DE EXTENSIÓN/REDUCCIÓN DE FECHA FIN SEMESTRE
        count_eliminadas = 0
        count_creadas = 0
        
        if nueva_fecha_fin:
            nueva_fecha_obj = datetime.strptime(nueva_fecha_fin, '%Y-%m-%d').date()
            fecha_fin_actual = reserva_padre.fecha_fin_semestre
            
            # Obtener la última fecha de reserva del grupo
            ultima_reserva = reservas_grupo.last()
            ultima_fecha = ultima_reserva.fecha if ultima_reserva else reserva_padre.fecha
            
            if nueva_fecha_obj > fecha_fin_actual:
                # 🔥 EXTENSIÓN: Crear reservas faltantes
                # Calcular fechas faltantes (cada 7 días desde la última reserva + 7 días)
                fecha_siguiente = ultima_fecha + timedelta(days=7)
                
                # Obtener los datos actuales o nuevos para las reservas
                aula_id = int(nueva_aula_id) if nueva_aula_id else reserva_padre.aula_id
                catedra_id = int(nueva_catedra_id) if nueva_catedra_id else reserva_padre.catedra_id
                docente = nuevo_docente if nuevo_docente is not None else reserva_padre.docente
                hora_inicio = datetime.strptime(nueva_hora_inicio, '%H:%M').time() if nueva_hora_inicio else reserva_padre.hora_inicio
                hora_fin = datetime.strptime(nueva_hora_fin, '%H:%M').time() if nueva_hora_fin else reserva_padre.hora_fin
                
                # Crear reservas para las fechas faltantes
                while fecha_siguiente <= nueva_fecha_obj:
                    # Verificar que no haya choque
                    choque = Reserva.objects.filter(
                        aula_id=aula_id,
                        fecha=fecha_siguiente,
                        hora_inicio__lt=hora_fin,
                        hora_fin__gt=hora_inicio
                    ).exists()
                    
                    if choque:
                        return JsonResponse({
                            'success': False,
                            'message': f'Choque de horario detectado el {fecha_siguiente.strftime("%d/%m/%Y")} al intentar crear reserva faltante'
                        }, status=400)
                    
                    # Crear la nueva reserva
                    Reserva.objects.create(
                        aula_id=aula_id,
                        catedra_id=catedra_id,
                        docente=docente,
                        fecha=fecha_siguiente,
                        hora_inicio=hora_inicio,
                        hora_fin=hora_fin,
                        tipo='semestral',
                        fecha_fin_semestre=nueva_fecha_obj
                    )
                    
                    count_creadas += 1
                    fecha_siguiente += timedelta(days=7)
                
                # Refrescar el queryset para incluir las nuevas reservas
                reservas_grupo = Reserva.objects.filter(
                    docente=docente,
                    catedra_id=catedra_id,
                    aula_id=aula_id,
                    hora_inicio=hora_inicio,
                    hora_fin=hora_fin,
                    tipo='semestral'
                ).order_by('fecha')
                
            elif nueva_fecha_obj < fecha_fin_actual:
                # 🔥 REDUCCIÓN: Eliminar reservas fuera de rango
                reservas_a_eliminar = reservas_grupo.filter(fecha__gt=nueva_fecha_obj)
                count_eliminadas = reservas_a_eliminar.count()
                reservas_a_eliminar.delete()
                
                # Actualizar el queryset para solo las que quedan
                reservas_grupo = reservas_grupo.filter(fecha__lte=nueva_fecha_obj)
        
        # Preparar datos para actualizar
        datos_actualizar = {}
        
        if nuevo_docente is not None:
            datos_actualizar['docente'] = nuevo_docente
        
        if nueva_catedra_id:
            datos_actualizar['catedra_id'] = int(nueva_catedra_id)
        
        if nueva_aula_id:
            datos_actualizar['aula_id'] = int(nueva_aula_id)
        
        if nueva_hora_inicio:
            datos_actualizar['hora_inicio'] = datetime.strptime(nueva_hora_inicio, '%H:%M').time()
        
        if nueva_hora_fin:
            datos_actualizar['hora_fin'] = datetime.strptime(nueva_hora_fin, '%H:%M').time()
        
        if nueva_fecha_fin:
            datos_actualizar['fecha_fin_semestre'] = datetime.strptime(nueva_fecha_fin, '%Y-%m-%d').date()
        
        # Validar choques de horario si se cambió aula o horarios
        if nueva_aula_id or nueva_hora_inicio or nueva_hora_fin:
            aula_a_validar = int(nueva_aula_id) if nueva_aula_id else reserva_padre.aula_id
            hora_inicio_a_validar = datetime.strptime(nueva_hora_inicio, '%H:%M').time() if nueva_hora_inicio else reserva_padre.hora_inicio
            hora_fin_a_validar = datetime.strptime(nueva_hora_fin, '%H:%M').time() if nueva_hora_fin else reserva_padre.hora_fin
            
            # Verificar choques para cada fecha del grupo
            ids_grupo = list(reservas_grupo.values_list('id', flat=True))
            for reserva in reservas_grupo:
                choque = Reserva.objects.filter(
                    aula_id=aula_a_validar,
                    fecha=reserva.fecha,
                    hora_inicio__lt=hora_fin_a_validar,
                    hora_fin__gt=hora_inicio_a_validar
                ).exclude(id__in=ids_grupo).exists()
                
                if choque:
                    return JsonResponse({
                        'success': False,
                        'message': f'Choque de horario detectado el {reserva.fecha.strftime("%d/%m/%Y")}'
                    }, status=400)
        
        # Actualizar TODAS las reservas del grupo
        if datos_actualizar:
            reservas_grupo.update(**datos_actualizar)
        
        # Construir mensaje
        mensaje = 'Grupo actualizado correctamente.'
        if count_creadas > 0:
            mensaje += f' Se crearon {count_creadas} reserva(s) adicional(es).'
        if count_eliminadas > 0:
            mensaje += f' Se eliminaron {count_eliminadas} reserva(s) fuera del nuevo rango.'
        
        return JsonResponse({
            'success': True,
            'message': mensaje
        })
        
    except ValueError as e:
        return JsonResponse({
            'success': False,
            'message': f'Formato de datos inválido: {str(e)}'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error inesperado: {str(e)}'
        }, status=500)