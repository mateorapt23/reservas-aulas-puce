"""
API REST para consultar disponibilidad de aulas
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from configuracion.models import Aula, Requerimiento
from reservas.models import Reserva
from datetime import datetime, time
import json


@csrf_exempt
@require_http_methods(["POST"])
def consultar_disponibilidad(request):
    """
    Endpoint para consultar aulas disponibles
    
    Body JSON:
    {
        "fecha": "2024-02-10",
        "hora_inicio": "09:00",
        "hora_fin": "11:00",
        "requerimientos": ["Proyector", "Computadora"],
        "capacidad_minima": 30
    }
    """
    try:
        data = json.loads(request.body)
        
        fecha = data.get('fecha')
        hora_inicio = data.get('hora_inicio')
        hora_fin = data.get('hora_fin')
        requerimientos_nombres = data.get('requerimientos', [])
        capacidad_minima = data.get('capacidad_minima', 0)
        
        # Validaciones
        if not fecha or not hora_inicio or not hora_fin:
            return JsonResponse({
                'error': 'Faltan parámetros requeridos: fecha, hora_inicio, hora_fin'
            }, status=400)
        
        # Convertir strings a objetos datetime
        try:
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
            hora_inicio_obj = datetime.strptime(hora_inicio, '%H:%M').time()
            hora_fin_obj = datetime.strptime(hora_fin, '%H:%M').time()
        except ValueError as e:
            return JsonResponse({
                'error': f'Formato de fecha/hora inválido: {str(e)}'
            }, status=400)
        
        # Obtener requerimientos por nombre
        requerimientos_ids = []
        if requerimientos_nombres:
            requerimientos_ids = list(
                Requerimiento.objects.filter(
                    nombre__in=requerimientos_nombres
                ).values_list('id', flat=True)
            )
        
        # Buscar todas las aulas
        todas_las_aulas = Aula.objects.all()
        
        aulas_disponibles = []
        aulas_ocupadas = []
        
        for aula in todas_las_aulas:
            # Verificar capacidad
            if aula.capacidad < capacidad_minima:
                continue
            
            # Verificar si tiene choque de horario
            choque = Reserva.objects.filter(
                aula=aula,
                fecha=fecha_obj,
                hora_inicio__lt=hora_fin_obj,
                hora_fin__gt=hora_inicio_obj
            ).exists()
            
            # Obtener requerimientos del aula
            reqs_del_aula = set(aula.requerimientos.values_list('id', flat=True))
            reqs_solicitados = set(requerimientos_ids)
            
            # Calcular coincidencias
            coincidencias = len(reqs_del_aula.intersection(reqs_solicitados))
            tiene_todos = coincidencias == len(reqs_solicitados) and len(reqs_solicitados) > 0
            
            aula_info = {
                'numero': aula.numero,
                'capacidad': aula.capacidad,
                'requerimientos': list(aula.requerimientos.values_list('nombre', flat=True)),
                'cumple_requerimientos': tiene_todos,
                'coincidencias': coincidencias,
                'disponible': not choque
            }
            
            if not choque:
                aulas_disponibles.append(aula_info)
            else:
                # Obtener info de la reserva que choca
                reserva_choque = Reserva.objects.filter(
                    aula=aula,
                    fecha=fecha_obj,
                    hora_inicio__lt=hora_fin_obj,
                    hora_fin__gt=hora_inicio_obj
                ).first()
                
                aula_info['reserva_actual'] = {
                    'docente': reserva_choque.docente,
                    'catedra': reserva_choque.catedra.nombre,
                    'hora_inicio': reserva_choque.hora_inicio.strftime('%H:%M'),
                    'hora_fin': reserva_choque.hora_fin.strftime('%H:%M')
                }
                aulas_ocupadas.append(aula_info)
        
        # Ordenar aulas disponibles por prioridad
        aulas_disponibles.sort(
            key=lambda x: (not x['cumple_requerimientos'], -x['coincidencias'], x['capacidad'])
        )
        
        return JsonResponse({
            'fecha': fecha,
            'hora_inicio': hora_inicio,
            'hora_fin': hora_fin,
            'total_disponibles': len(aulas_disponibles),
            'total_ocupadas': len(aulas_ocupadas),
            'aulas_disponibles': aulas_disponibles,
            'aulas_ocupadas': aulas_ocupadas
        })
    
    except Exception as e:
        return JsonResponse({
            'error': f'Error interno: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def listar_requerimientos(request):
    """
    Endpoint para listar todos los requerimientos disponibles
    """
    requerimientos = Requerimiento.objects.all().values('id', 'nombre')
    return JsonResponse({
        'requerimientos': list(requerimientos)
    })