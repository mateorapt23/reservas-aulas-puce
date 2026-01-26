from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView  # 👈 Importar esto

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', RedirectView.as_view(url='/reservas/nueva/', permanent=False)),  # 👈 Agregar esto
    path('', include('usuarios.urls')),
    path('reservas/', include('reservas.urls')),
    path('configuracion/', include('configuracion.urls')),
    path('calendario/', include('calendario.urls')),
]