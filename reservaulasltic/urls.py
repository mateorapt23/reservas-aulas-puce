from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
    path('', lambda request: redirect('reservas/nueva/')),  # 👈 ESTA LÍNEA
    path('admin/', admin.site.urls),
    path('reservas/', include('reservas.urls')),
    path('calendario/', include('calendario.urls')),
    path('configuracion/', include('configuracion.urls')),
]