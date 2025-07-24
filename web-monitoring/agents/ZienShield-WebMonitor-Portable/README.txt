# ZienShield Web Monitor - Windows Portable

## 📋 Descripción
Monitor de tráfico web portable para Windows que envía métricas al sistema ZienShield Security Platform.

## 📦 Contenido del Paquete
- `zienshield-web-monitor-windows.py` - Programa principal
- `ZienShield-Monitor.bat` - Launcher con menú interactivo  
- `INSTRUCCIONES.txt` - Guía de instalación y uso
- `README.txt` - Este archivo

## ⚡ Instalación Rápida

### Opción 1: Launcher Gráfico (Recomendado)
1. Hacer doble clic en `ZienShield-Monitor.bat`
2. Seguir el menú interactivo

### Opción 2: Línea de Comandos
1. Abrir PowerShell o CMD como Administrador
2. Navegar a la carpeta del monitor
3. Ejecutar: `python zienshield-web-monitor-windows.py`

## 📋 Requisitos del Sistema
- **Sistema Operativo**: Windows 7, 8, 10, 11
- **Python**: Versión 3.7 o superior
- **Conexión a Internet**: Para enviar métricas al servidor
- **Permisos**: Usuario normal (no requiere administrador)

## 🚀 Modos de Ejecución

### 1. Monitoreo Continuo (Recomendado)
```cmd
python zienshield-web-monitor-windows.py
```
- Ejecuta monitoreo cada 30 segundos
- Presionar Ctrl+C para detener

### 2. Ejecución Única
```cmd
python zienshield-web-monitor-windows.py --once
```
- Ejecuta una sola vez y termina
- Útil para pruebas

### 3. Modo Test
```cmd
python zienshield-web-monitor-windows.py --test
```
- Prueba conectividad al servidor
- Verifica recopilación de datos

### 4. Ayuda
```cmd
python zienshield-web-monitor-windows.py --help
```
- Muestra todas las opciones disponibles

## 📊 Datos Que Monitorea

### 🌐 Conexiones de Red
- Conexiones TCP activas a sitios web
- Direcciones IP y puertos remotos
- Resolución de dominios

### 🔍 Navegadores Web
- Chrome, Firefox, Edge, Opera, Brave, etc.
- Número de procesos por navegador
- Uso de memoria de navegadores

### 📈 Categorización de Sitios
- **Social**: Facebook, Twitter, Instagram, LinkedIn
- **Video**: YouTube, Netflix, Twitch, Vimeo  
- **Trabajo**: Google, Office, Slack, Teams
- **Noticias**: CNN, BBC, Reddit, NY Times
- **Compras**: Amazon, eBay, MercadoLibre
- **Streaming**: Spotify, Apple Music, SoundCloud
- **Gaming**: Steam, Epic Games, Battle.net
- **Educación**: Wikipedia, Coursera, Khan Academy
- **Nube**: Google Drive, Dropbox, OneDrive
- **Desarrollo**: GitHub, Stack Overflow, GitLab

### 🖥️ Información del Sistema
- Nombre del equipo y usuario
- Versión de Windows
- Arquitectura del sistema

## 🔒 Privacidad y Seguridad

### ✅ Lo que SÍ hace:
- Recopila estadísticas de conexiones de red
- Detecta qué navegadores están en uso
- Categoriza dominios visitados por tipo
- Envía métricas agregadas (no contenido)

### ❌ Lo que NO hace:
- **No** captura contenido de páginas web
- **No** lee historial de navegación
- **No** accede a datos personales o archivos
- **No** intercepta tráfico web o contraseñas
- **No** funciona como keylogger o spyware

### 🛡️ Datos Enviados al Servidor:
```json
{
  "agent_id": "DESKTOP-ABC123-user-12345",
  "total_connections": 25,
  "total_domains": 8,
  "active_browsers": 15,
  "top_domains": [["google.com", 5], ["facebook.com", 3]],
  "categories_summary": {"work": 5, "social": 3, "other": 2}
}
```

## 📁 Archivos de Log

### Ubicación
- **Ruta**: `~/Documents/ZienShield/zienshield-web-traffic.log`
- **Formato**: JSON estructurado
- **Propósito**: Backup local de todas las métricas

### Ejemplo de Log
```json
{
  "zienshield_web_traffic": {
    "timestamp": "2025-01-15T10:30:00",
    "agent_id": "DESKTOP-PC01-user-12345",
    "total_connections": 15,
    "browser_processes": [
      {"browser": "chrome", "process_count": 8, "memory_mb": 245.6}
    ]
  }
}
```

## 🌐 Configuración del Servidor

### Servidor ZienShield
- **URL**: http://194.164.172.92:3001
- **Endpoint**: /agent-metrics
- **Método**: HTTP POST
- **Formato**: JSON

### Verificar Conectividad
```cmd
python zienshield-web-monitor-windows.py --test
```

## 🔧 Solución de Problemas

### Python No Instalado
```
❌ Error: Python no está instalado
```
**Solución**:
1. Ir a https://python.org/downloads
2. Descargar Python 3.8+
3. Instalar marcando "Add Python to PATH"
4. Reiniciar terminal

### Error de Requests
```
❌ Error: No module named 'requests'
```  
**Solución**:
```cmd
pip install requests
```

### Error de Conectividad
```
❌ No se pudo conectar al servidor ZienShield
```
**Solución**:
1. Verificar conexión a Internet
2. Revisar firewall corporativo
3. Contactar administrador de red

### Permisos Insuficientes
```
❌ Error: Permission denied
```
**Solución**:
1. Ejecutar como administrador
2. O cambiar ubicación de logs a carpeta personal

## 📞 Soporte Técnico

### Información del Sistema
Ejecutar para obtener información de diagnóstico:
```cmd
python zienshield-web-monitor-windows.py --test
```

### Logs de Diagnóstico
- **Logs del programa**: ~/Documents/ZienShield/
- **Logs de Windows**: Visor de Eventos > Aplicaciones

### Contacto
- **Sistema**: ZienShield Security Platform
- **Administrador**: Contactar al equipo de TI
- **Documentación**: Revisar este archivo README

## 📋 Información Técnica

### Versión del Monitor
- **Versión**: 1.0 Portable
- **Compilado**: 2025-07-24 16:02:12
- **Compatibilidad**: Windows 7, 8, 10, 11
- **Python**: 3.7+ requerido

### Dependencias
- `requests` - Para comunicación HTTP
- `json` - Para formato de datos  
- `socket` - Para resolución DNS
- `subprocess` - Para comandos del sistema
- Librerías estándar de Python

### Algoritmo de Monitoreo
1. **Recopilación**: Usar `netstat -an` para conexiones TCP
2. **Filtrado**: Excluir conexiones locales (127.x, 192.168.x, 10.x)
3. **Resolución**: Convertir IPs a nombres de dominio
4. **Categorización**: Clasificar dominios por tipo de sitio
5. **Agregación**: Sumar estadísticas por dominio y categoría
6. **Envío**: POST HTTP al servidor ZienShield
7. **Backup**: Guardar copia local en formato JSON

### Frecuencia de Monitoreo
- **Continuo**: Cada 30 segundos
- **Timeout Red**: 15 segundos
- **Timeout DNS**: 5 segundos por resolución
- **Reintento**: 3 intentos en caso de error

---

© 2025 ZienShield Security Platform
Generado automáticamente el 2025-07-24 16:02:12
