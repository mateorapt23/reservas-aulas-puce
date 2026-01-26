from django.urls import path
from django.contrib.auth.decorators import login_required
from .views import (
    requerimientos,
    catedras,
    aulas,

    crear_requerimiento,
    editar_requerimiento,
    eliminar_requerimiento,
    eliminar_requerimientos_masivo,

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
    path('requerimientos/', login_required(requerimientos), name='requerimientos'),
    path('requerimientos/crear/', login_required(crear_requerimiento), name='crear_requerimiento'),
    path('requerimientos/<int:id>/editar/', login_required(editar_requerimiento), name='editar_requerimiento'),
    path('requerimientos/<int:id>/eliminar/', login_required(eliminar_requerimiento), name='eliminar_requerimiento'),
    path('requerimientos/eliminar-masivo/', login_required(eliminar_requerimientos_masivo), name='eliminar_requerimientos_masivo'),

    # =====================
    # CÁTEDRAS
    # =====================
    path('catedras/', login_required(catedras), name='catedras'),
    path('catedras/crear/', login_required(crear_catedra), name='crear_catedra'),
    path('catedras/<int:id>/editar/', login_required(editar_catedra), name='editar_catedra'),
    path('catedras/<int:id>/eliminar/', login_required(eliminar_catedra), name='eliminar_catedra'),
    path('catedras/eliminar-masivo/', login_required(eliminar_catedras_masivo), name='eliminar_catedras_masivo'), 

    # =====================
    # AULAS
    # =====================
    path('aulas/', login_required(aulas), name='aulas'),
    path('aulas/crear/', login_required(crear_aula), name='crear_aula'),
    path('aulas/<int:id>/editar/', login_required(editar_aula), name='editar_aula'),
    path('aulas/<int:id>/eliminar/', login_required(eliminar_aula), name='eliminar_aula'),
    path('aulas/eliminar-masivo/', login_required(eliminar_aulas_masivo), name='eliminar_aulas_masivo'),
]