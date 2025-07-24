#!/bin/bash

echo "🔧 Instalando dependencias para ZienShield Web Monitor"
echo "=================================================="

# Verificar si tenemos permisos sudo
if ! sudo -v 2>/dev/null; then
    echo "❌ Este script requiere permisos sudo para instalar dependencias del sistema"
    echo "💡 Ejecuta: sudo bash install-dependencies.sh"
    exit 1
fi

# Actualizar repositorios
echo "📦 Actualizando repositorios..."
sudo apt update -qq

# Instalar dependencias Python
echo "🐍 Instalando dependencias Python..."
sudo apt install -y python3-psutil python3-pip

# Verificar instalación
echo "✅ Verificando instalación..."
python3 -c "import psutil; print(f'psutil versión: {psutil.__version__}')" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ psutil instalado correctamente"
else
    echo "❌ Error instalando psutil"
    exit 1
fi

# Para distribuciones que requieren dependencias adicionales
echo "🔧 Instalando herramientas de red adicionales..."
sudo apt install -y net-tools lsof iftop nethogs 2>/dev/null || true

echo ""
echo "✅ Dependencias instaladas correctamente"
echo "🚀 Ahora puedes ejecutar:"
echo "   python3 zienshield-web-monitor.py --once"
echo "   python3 zienshield-web-monitor.py  # Para monitoreo continuo"