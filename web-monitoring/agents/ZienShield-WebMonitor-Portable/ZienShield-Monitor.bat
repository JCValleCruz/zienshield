@echo off
title ZienShield Web Monitor
color 0A

echo.
echo =====================================
echo   🛡️  ZienShield Web Monitor
echo =====================================
echo.

:: Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python no está instalado en este sistema
    echo.
    echo Para instalar Python:
    echo 1. Ve a https://python.org/downloads
    echo 2. Descarga Python 3.8 o superior
    echo 3. Instala marcando "Add Python to PATH"
    echo 4. Reinicia esta aplicación
    echo.
    pause
    goto :end
)

echo ✅ Python detectado correctamente
echo.

:: Menú de opciones
:menu
echo ¿Qué deseas hacer?
echo.
echo 1. Ejecutar monitoreo continuo
echo 2. Ejecutar una sola vez (test)
echo 3. Probar configuración
echo 4. Ver ayuda
echo 5. Salir
echo.
set /p choice="Selecciona una opción (1-5): "

if "%choice%"=="1" goto continuous
if "%choice%"=="2" goto once  
if "%choice%"=="3" goto test
if "%choice%"=="4" goto help
if "%choice%"=="5" goto end
echo Opción inválida
goto menu

:continuous
echo.
echo 🔄 Iniciando monitoreo continuo...
echo Presiona Ctrl+C para detener
echo.
python zienshield-web-monitor-windows.py
goto menu

:once
echo.
echo 🔄 Ejecutando una sola vez...
echo.
python zienshield-web-monitor-windows.py --once
echo.
pause
goto menu

:test
echo.
echo 🧪 Probando configuración...
echo.
python zienshield-web-monitor-windows.py --test
echo.
pause
goto menu

:help
echo.
python zienshield-web-monitor-windows.py --help
echo.
pause
goto menu

:end
echo.
echo 👋 ¡Hasta luego!
echo.
