# usuarios/views.py
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages


def home(request):
    """Redirige a login o al panel según el estado de autenticación"""
    if request.user.is_authenticated:
        return redirect('reservas:nueva_reserva')
    return redirect('usuarios:login')

def login_view(request):
    # Si ya está autenticado, redirigir al panel
    if request.user.is_authenticated:
        return redirect('reservas:nueva_reserva')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            # Redirigir a la página que intentaba acceder o al inicio
            next_url = request.GET.get('next', 'reservas:nueva_reserva')
            return redirect(next_url)
        else:
            # El error se mostrará en el template
            return render(request, 'usuarios/login.html', {'form': {'errors': True}})
    
    return render(request, 'usuarios/login.html')


@login_required
def logout_view(request):
    logout(request)
    messages.info(request, 'Has cerrado sesión correctamente')
    return redirect('usuarios:login')