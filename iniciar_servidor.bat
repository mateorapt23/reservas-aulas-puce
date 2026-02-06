@echo off
title Sistema de Reservas LTIC - Servidor Activo
color 0A
cd /d "%~dp0"
echo ====================================
echo   SISTEMA DE RESERVAS - LTIC
echo ====================================
echo.
echo Iniciando servidor...
echo.
call venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
pause