from django.urls import path
from . import views

app_name = 'usuarios'

urlpatterns = [
    path('', views.home, name='home'),  # 👈 Agregar esto
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
]