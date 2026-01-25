from django.urls import path
from .views import (
    requerimientos,
    catedras,
    aulas,

    crear_requerimiento,
    editar_requerimiento,
    eliminar_requerimiento,
    eliminar_requerimientos_masivo,  # 👈 Agregar aquí

    crear_catedra,
    editar_catedra,
    eliminar_catedra,
    eliminar_catedras_masivo,

    crear_aula,
    editar_aula,
    eliminar_aula,
    eliminar_aulas_masivo, 
)

app_name = "configuracion"

urlpatterns = [
    # =====================
    # REQUERIMIENTOS
    # =====================
    path('requerimientos/', requerimientos, name='requerimientos'),
    path('requerimientos/crear/', crear_requerimiento, name='crear_requerimiento'),
    path('requerimientos/<int:id>/editar/', editar_requerimiento, name='editar_requerimiento'),
    path('requerimientos/<int:id>/eliminar/', eliminar_requerimiento, name='eliminar_requerimiento'),
    path('requerimientos/eliminar-masivo/', eliminar_requerimientos_masivo, name='eliminar_requerimientos_masivo'),  # 👈 Sin 'views.'

    # =====================
    # CÁTEDRAS
    # =====================
    path('catedras/', catedras, name='catedras'),
    path('catedras/crear/', crear_catedra, name='crear_catedra'),
    path('catedras/<int:id>/editar/', editar_catedra, name='editar_catedra'),
    path('catedras/<int:id>/eliminar/', eliminar_catedra, name='eliminar_catedra'),
    path('catedras/eliminar-masivo/', eliminar_catedras_masivo, name='eliminar_catedras_masivo'), 

    # =====================
    # AULAS
    # =====================
    path('aulas/', aulas, name='aulas'),
    path('aulas/crear/', crear_aula, name='crear_aula'),
    path('aulas/<int:id>/editar/', editar_aula, name='editar_aula'),
    path('aulas/<int:id>/eliminar/', eliminar_aula, name='eliminar_aula'),
    path('aulas/eliminar-masivo/', eliminar_aulas_masivo, name='eliminar_aulas_masivo'),
]