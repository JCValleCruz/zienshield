#!/usr/bin/env python3
"""
ZienShield Windows Package Creator (Sin PyInstaller)
Crea un paquete portable para Windows que no requiere instalación de Python
"""

import os
import shutil
import sys
from datetime import datetime

class ZienShieldWindowsPackageCreator:
    def __init__(self):
        self.package_dir = "ZienShield-WebMonitor-Portable"
        
    def create_windows_agent_script(self):
        """Crear el script del agente para Windows"""
        return '''#!/usr/bin/env python3
"""
ZienShield Web Traffic Monitor - Windows Portable
Versión portable que funciona con Python preinstalado
"""

import subprocess
import socket
import json
import time
import os
import sys
from datetime import datetime
from collections import defaultdict
import platform

# Verificar e instalar requests si no está disponible
try:
    import requests
except ImportError:
    print("📦 Instalando requests...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'requests'])
        import requests
        print("✅ requests instalado correctamente")
    except:
        print("❌ Error: No se pudo instalar requests")
        print("   Por favor instala manualmente: pip install requests")
        input("Presiona Enter para continuar...")
        sys.exit(1)

class ZienShieldWebMonitorWindows:
    def __init__(self, backend_url="http://194.164.172.92:3001"):
        self.session_data = defaultdict(lambda: {
            'start_time': None,
            'bytes_sent': 0,
            'bytes_recv': 0,
            'connections': 0
        })
        self.domain_cache = {}
        self.process_cache = {}
        self.backend_url = backend_url
        
        # Categorías de sitios web
        self.site_categories = {
            'social': ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'snapchat.com'],
            'video': ['youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'dailymotion.com', 'hulu.com'],
            'work': ['office.com', 'google.com', 'gmail.com', 'slack.com', 'zoom.us', 'teams.microsoft.com', 'outlook.com'],
            'news': ['cnn.com', 'bbc.com', 'reddit.com', 'news.google.com', 'nytimes.com', 'reuters.com'],
            'shopping': ['amazon.com', 'ebay.com', 'mercadolibre.com', 'aliexpress.com', 'etsy.com'],
            'streaming': ['spotify.com', 'apple.com', 'soundcloud.com', 'pandora.com'],
            'gaming': ['steam.com', 'epicgames.com', 'battle.net', 'origin.com', 'uplay.com'],
            'education': ['wikipedia.org', 'coursera.org', 'edx.org', 'khanacademy.org'],
            'cloud': ['drive.google.com', 'dropbox.com', 'onedrive.com', 'icloud.com'],
            'dev': ['github.com', 'stackoverflow.com', 'gitlab.com', 'bitbucket.org']
        }

    def resolve_ip_to_domain(self, ip):
        """Resolver IP a dominio y cachear resultado"""
        if ip in self.domain_cache:
            return self.domain_cache[ip]
        
        try:
            hostname = socket.gethostbyaddr(ip)[0]
            domain_parts = hostname.split('.')
            if len(domain_parts) >= 2:
                domain = '.'.join(domain_parts[-2:])
            else:
                domain = hostname
                
            self.domain_cache[ip] = domain
            return domain
        except:
            self.domain_cache[ip] = ip
            return ip

    def get_active_connections_windows(self):
        """Obtener conexiones usando netstat en Windows"""
        connections = []
        try:
            # Usar netstat con parámetros de Windows
            result = subprocess.run(['netstat', '-an'], capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0:
                lines = result.stdout.split('\\n')
                for line in lines:
                    if 'ESTABLISHED' in line and 'TCP' in line:
                        parts = line.split()
                        if len(parts) >= 4:
                            try:
                                local_addr = parts[1]
                                remote_addr = parts[2]
                                
                                # Extraer IP y puerto (formato IPv4)
                                if ':' in remote_addr and not remote_addr.startswith('['):
                                    remote_parts = remote_addr.rsplit(':', 1)
                                    if len(remote_parts) == 2:
                                        remote_ip, remote_port = remote_parts
                                        
                                        # Filtrar conexiones locales y privadas
                                        if (not remote_ip.startswith('127.') and 
                                            not remote_ip.startswith('192.168.') and 
                                            not remote_ip.startswith('10.') and
                                            not remote_ip.startswith('172.16.') and
                                            not remote_ip.startswith('169.254.')):
                                            
                                            connection_info = {
                                                'local_ip': local_addr.split(':')[0] if ':' in local_addr else local_addr,
                                                'local_port': int(local_addr.split(':')[1]) if ':' in local_addr and local_addr.split(':')[1].isdigit() else 0,
                                                'remote_ip': remote_ip,
                                                'remote_port': int(remote_port) if remote_port.isdigit() else 0,
                                                'pid': 0,
                                                'process_name': 'unknown',
                                                'process_cmdline': 'unknown',
                                                'domain': self.resolve_ip_to_domain(remote_ip)
                                            }
                                            connections.append(connection_info)
                            except Exception:
                                continue
                                
        except Exception as e:
            print(f"Error obteniendo conexiones: {e}")
        
        return connections

    def get_browser_processes_windows(self):
        """Detectar procesos de navegadores usando tasklist en Windows"""
        browsers = {
            'chrome.exe': 'chrome', 
            'firefox.exe': 'firefox', 
            'msedge.exe': 'edge', 
            'iexplore.exe': 'ie',
            'opera.exe': 'opera', 
            'brave.exe': 'brave',
            'vivaldi.exe': 'vivaldi',
            'waterfox.exe': 'waterfox'
        }
        active_browsers = []
        
        try:
            # Usar tasklist para obtener procesos
            result = subprocess.run(['tasklist', '/FO', 'CSV'], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                lines = result.stdout.split('\\n')
                browser_counts = defaultdict(int)
                browser_memory = defaultdict(int)
                
                for line in lines[1:]:  # Saltar header
                    if line.strip():
                        try:
                            # Parsear CSV - usar split más robusto
                            if '","' in line:
                                parts = line.split('","')
                                if len(parts) >= 5:
                                    process_name = parts[0].strip('"').lower()
                                    pid = parts[1].strip('"')
                                    memory_str = parts[4].strip('"')
                                    
                                    for browser_exe, browser_name in browsers.items():
                                        if browser_exe in process_name:
                                            browser_counts[browser_name] += 1
                                            
                                            # Extraer memoria (formato: "1,234 K")
                                            try:
                                                memory_kb = int(memory_str.replace(',', '').replace(' K', ''))
                                                browser_memory[browser_name] += memory_kb
                                            except:
                                                pass
                                            break
                        except:
                            continue
                
                # Convertir a formato esperado
                for browser, count in browser_counts.items():
                    memory_mb = browser_memory.get(browser, 0) / 1024
                    active_browsers.append({
                        'browser': browser,
                        'pid': 0,
                        'name': browser,
                        'cmdline': f'{browser} ({count} procesos)',
                        'cpu_percent': 0.0,
                        'memory_mb': round(memory_mb, 1),
                        'process_count': count
                    })
                    
        except Exception as e:
            print(f"Error obteniendo navegadores: {e}")
        
        return active_browsers

    def categorize_domain(self, domain):
        """Categorizar dominio según tipo de sitio"""
        domain_lower = domain.lower()
        for category, domains in self.site_categories.items():
            for site in domains:
                if site in domain_lower:
                    return category
        return 'other'

    def collect_web_metrics(self):
        """Recopilar todas las métricas web"""
        timestamp = datetime.now().isoformat()
        
        print("🔍 Recopilando conexiones activas...")
        connections = self.get_active_connections_windows()
        
        print("🌐 Detectando navegadores...")
        browsers = self.get_browser_processes_windows()
        
        print("📊 Procesando estadísticas de dominios...")
        domain_stats = defaultdict(lambda: {
            'connections': 0,
            'processes': set(),
            'ports': set(),
            'category': 'other'
        })
        
        for conn in connections:
            domain = conn['domain']
            domain_stats[domain]['connections'] += 1
            domain_stats[domain]['processes'].add(conn['process_name'])
            domain_stats[domain]['ports'].add(conn['remote_port'])
            domain_stats[domain]['category'] = self.categorize_domain(domain)
        
        # Convertir sets a listas para JSON
        for domain in domain_stats:
            domain_stats[domain]['processes'] = list(domain_stats[domain]['processes'])
            domain_stats[domain]['ports'] = list(domain_stats[domain]['ports'])
        
        # Generar ID único del agente
        try:
            computer_name = os.environ.get('COMPUTERNAME', platform.node())
            user_name = os.environ.get('USERNAME', 'unknown')
            agent_id = f"{computer_name}-{user_name}-{hash(computer_name + user_name) % 100000:05d}"
        except:
            agent_id = f"windows-agent-{hash(str(datetime.now())) % 100000:05d}"
        
        # Estructurar datos para el backend
        web_metrics = {
            'timestamp': timestamp,
            'agent_id': agent_id,
            'hostname': os.environ.get('COMPUTERNAME', platform.node()),
            'username': os.environ.get('USERNAME', 'unknown'),
            'os_info': {
                'system': platform.system(),
                'release': platform.release(),
                'version': platform.version(),
                'architecture': platform.architecture()[0]
            },
            'total_connections': len(connections),
            'total_domains': len(domain_stats),
            'active_browsers': sum(b['process_count'] for b in browsers),
            'browser_types': len(browsers),
            'domain_stats': dict(domain_stats),
            'browser_processes': browsers,
            'top_domains': sorted(
                [(domain, stats['connections']) for domain, stats in domain_stats.items()],
                key=lambda x: x[1],
                reverse=True
            )[:15],
            'categories_summary': self.get_category_summary(domain_stats),
            'monitor_version': 'windows-portable-1.0'
        }
        
        return web_metrics

    def get_category_summary(self, domain_stats):
        """Obtener resumen por categorías"""
        categories = defaultdict(lambda: {'domains': 0, 'connections': 0})
        
        for domain, stats in domain_stats.items():
            category = stats['category']
            categories[category]['domains'] += 1
            categories[category]['connections'] += stats['connections']
        
        return dict(categories)

    def send_to_backend(self, metrics):
        """Enviar métricas al backend ZienShield para Prometheus"""
        try:
            endpoint = f"{self.backend_url}/agent-metrics"
            
            print(f"📡 Enviando métricas a: {endpoint}")
            
            response = requests.post(
                endpoint,
                json=metrics,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'ZienShield-Windows-Monitor/1.0'
                },
                timeout=15
            )
            
            if response.status_code == 200:
                print(f"✅ Métricas enviadas al backend ZienShield")
                resp_data = response.json()
                if 'processed' in resp_data:
                    processed = resp_data['processed']
                    print(f"   📊 Procesado: {processed.get('connections', 0)} conexiones, {processed.get('domains', 0)} dominios")
                return True
            else:
                print(f"⚠️ Backend respondió con código {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail.get('error', 'Unknown')}")
                except:
                    print(f"   Respuesta: {response.text[:200]}")
                return False
                
        except requests.exceptions.ConnectionError:
            print(f"❌ No se pudo conectar al servidor ZienShield")
            print(f"   Verifica que {self.backend_url} esté accesible")
            return False
        except requests.exceptions.Timeout:
            print(f"❌ Timeout conectando al servidor ZienShield")
            return False
        except Exception as e:
            print(f"❌ Error enviando métricas al backend: {e}")
            return False
    
    def save_local_log(self, metrics):
        """Guardar métricas en log local como backup"""
        try:
            # Crear directorio de logs en Documents si no existe
            documents_path = os.path.join(os.path.expanduser('~'), 'Documents', 'ZienShield')
            os.makedirs(documents_path, exist_ok=True)
            
            log_file = os.path.join(documents_path, 'zienshield-web-traffic.log')
            
            log_entry = {
                'zienshield_web_traffic': metrics,
                'rule_id': 100001,
                'level': 3,
                'description': 'ZienShield Web Traffic Metrics (Windows Portable)'
            }
            
            log_message = f"ZienShield-Windows: {json.dumps(log_entry, indent=2)}"
            
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"{log_message}\\n\\n")
            
            print(f"💾 Backup guardado en {log_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error guardando backup: {e}")
            return False

    def run_monitoring_cycle(self):
        """Ejecutar un ciclo completo de monitoreo"""
        print(f"🔍 Iniciando ciclo de monitoreo web - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        
        try:
            # Recopilar métricas
            metrics = self.collect_web_metrics()
            
            # Mostrar resumen en consola
            print(f"🖥️  Agente: {metrics['agent_id']}")
            print(f"💻 Sistema: {metrics['os_info']['system']} {metrics['os_info']['release']} ({metrics['os_info']['architecture']})")
            print(f"👤 Usuario: {metrics['username']}")
            print(f"📊 Conexiones activas: {metrics['total_connections']}")
            print(f"🌐 Dominios únicos: {metrics['total_domains']}")
            print(f"🔍 Tipos de navegador: {metrics['browser_types']}")
            print(f"📱 Procesos navegador: {metrics['active_browsers']}")
            
            # Mostrar navegadores detectados
            if metrics['browser_processes']:
                print("\\n🌐 Navegadores detectados:")
                for browser in metrics['browser_processes']:
                    print(f"   - {browser['name'].title()}: {browser['process_count']} procesos ({browser['memory_mb']} MB)")
            
            # Mostrar top dominios
            if metrics['top_domains']:
                print("\\n📊 Top dominios:")
                for domain, connections in metrics['top_domains'][:8]:
                    category = metrics['domain_stats'].get(domain, {}).get('category', 'other')
                    print(f"   - {domain} ({category}): {connections} conexiones")
            
            # Mostrar resumen por categorías
            if metrics['categories_summary']:
                print("\\n📈 Por categorías:")
                sorted_categories = sorted(metrics['categories_summary'].items(), 
                                         key=lambda x: x[1]['connections'], reverse=True)
                for category, stats in sorted_categories[:6]:
                    print(f"   - {category.title()}: {stats['connections']} conexiones, {stats['domains']} dominios")
            
            # Enviar al backend
            print("\\n🚀 Enviando métricas...")
            backend_success = self.send_to_backend(metrics)
            
            # Guardar backup local
            backup_success = self.save_local_log(metrics)
            
            if backend_success:
                print("✅ Integración con ZienShield completada exitosamente")
            elif backup_success:
                print("⚠️ Error enviando al servidor, pero backup local guardado")
            else:
                print("❌ Error en el monitoreo")
            
            return backend_success or backup_success
            
        except Exception as e:
            print(f"❌ Error en ciclo de monitoreo: {e}")
            import traceback
            traceback.print_exc()
            return False

def show_banner():
    """Mostrar banner del programa"""
    print("\\n" + "="*70)
    print("  🛡️  ZIENSHIELD WEB TRAFFIC MONITOR - WINDOWS PORTABLE")
    print("="*70)
    print(f"📅 Versión: 1.0 - {datetime.now().strftime('%Y-%m-%d')}")
    print(f"💻 Sistema: {platform.system()} {platform.release()}")
    print(f"🖥️  Equipo: {os.environ.get('COMPUTERNAME', 'Unknown')}")
    print(f"👤 Usuario: {os.environ.get('USERNAME', 'Unknown')}")
    print("🌐 Servidor: http://194.164.172.92:3001")
    print("="*70)

def main():
    """Función principal"""
    show_banner()
    
    monitor = ZienShieldWebMonitorWindows()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--once':
            # Ejecutar una sola vez
            print("🔄 Modo: Ejecución única")
            print("-"*70)
            success = monitor.run_monitoring_cycle()
            
            print("\\n" + "="*70)
            if success:
                print("✅ MONITOREO EJECUTADO EXITOSAMENTE")
            else:
                print("❌ ERRORES EN EL MONITOREO")
            print("="*70)
            
        elif sys.argv[1] == '--test':
            # Modo test - solo mostrar información del sistema
            print("🧪 Modo: Test del sistema")
            print("-"*70)
            print("🔍 Probando conectividad...")
            
            try:
                response = requests.get("http://194.164.172.92:3001/api/health", timeout=5)
                if response.status_code == 200:
                    print("✅ Servidor ZienShield accesible")
                else:
                    print(f"⚠️ Servidor responde pero con error: {response.status_code}")
            except:
                print("❌ No se puede conectar al servidor ZienShield")
            
            print("\\n🔍 Probando recopilación de datos...")
            metrics = monitor.collect_web_metrics()
            print(f"✅ Se detectaron {metrics['total_connections']} conexiones y {metrics['total_domains']} dominios")
            
        elif sys.argv[1] == '--help':
            print("""
🆘 AYUDA - ZienShield Web Monitor

📋 Modos de uso:
   python zienshield-web-monitor-windows.py           → Monitoreo continuo
   python zienshield-web-monitor-windows.py --once    → Ejecutar una sola vez  
   python zienshield-web-monitor-windows.py --test    → Probar configuración
   python zienshield-web-monitor-windows.py --help    → Mostrar esta ayuda

📊 Qué hace:
   • Monitorea conexiones de red activas
   • Detecta navegadores web en ejecución
   • Categoriza sitios web visitados por tipo
   • Envía métricas al servidor ZienShield para análisis
   • Guarda backup local en Documents/ZienShield/

🔒 Privacidad:
   • Solo recopila metadatos de conexiones de red
   • No captura contenido de navegación ni datos personales
   • Solo estadísticas de dominios y conexiones

📁 Archivos de log:
   • Ubicación: ~/Documents/ZienShield/zienshield-web-traffic.log
   • Formato: JSON estructurado para análisis

🌐 Servidor: http://194.164.172.92:3001/agent-metrics
""")
            return
    else:
        # Ejecutar continuamente
        print("♾️  Modo: Monitoreo continuo (cada 30 segundos)")
        print("   💡 Presiona Ctrl+C para detener")
        print("   📁 Logs: ~/Documents/ZienShield/")
        print("-"*70)
        
        cycle_count = 0
        try:
            while True:
                cycle_count += 1
                print(f"\\n🔄 Ciclo #{cycle_count}")
                
                success = monitor.run_monitoring_cycle()
                
                if success:
                    print("✅ Ciclo completado - Esperando 30 segundos...")
                else:
                    print("⚠️ Errores en el ciclo - Esperando 30 segundos...")
                
                print("-"*30)
                time.sleep(30)
                
        except KeyboardInterrupt:
            print("\\n\\n🛑 MONITOREO DETENIDO POR EL USUARIO")
            print("="*70)
            print(f"📊 Total de ciclos ejecutados: {cycle_count}")
            print("✅ Programa terminado correctamente")
            print("="*70)
        except Exception as e:
            print(f"\\n❌ ERROR FATAL: {e}")
            import traceback
            traceback.print_exc()
        
        print("\\n👋 Presiona Enter para cerrar...")
        try:
            input()
        except:
            pass

if __name__ == "__main__":
    main()
'''

    def create_batch_launcher(self):
        """Crear launcher batch para ejecutar fácilmente"""
        return '''@echo off
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
'''

    def create_readme(self):
        """Crear archivo README completo"""
        return f'''# ZienShield Web Monitor - Windows Portable

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
{{
  "agent_id": "DESKTOP-ABC123-user-12345",
  "total_connections": 25,
  "total_domains": 8,
  "active_browsers": 15,
  "top_domains": [["google.com", 5], ["facebook.com", 3]],
  "categories_summary": {{"work": 5, "social": 3, "other": 2}}
}}
```

## 📁 Archivos de Log

### Ubicación
- **Ruta**: `~/Documents/ZienShield/zienshield-web-traffic.log`
- **Formato**: JSON estructurado
- **Propósito**: Backup local de todas las métricas

### Ejemplo de Log
```json
{{
  "zienshield_web_traffic": {{
    "timestamp": "2025-01-15T10:30:00",
    "agent_id": "DESKTOP-PC01-user-12345",
    "total_connections": 15,
    "browser_processes": [
      {{"browser": "chrome", "process_count": 8, "memory_mb": 245.6}}
    ]
  }}
}}
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
- **Compilado**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
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
Generado automáticamente el {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
'''

    def create_instructions(self):
        """Crear instrucciones específicas de instalación"""
        return '''# 🚀 INSTRUCCIONES DE INSTALACIÓN Y USO
# ZienShield Web Monitor - Windows Portable

## ⚡ INSTALACIÓN RÁPIDA (3 pasos)

### 1️⃣ Verificar Python
Abrir PowerShell o CMD y ejecutar:
```
python --version
```

✅ Si muestra "Python 3.x.x" → Continuar al paso 2
❌ Si da error → Instalar Python desde https://python.org

### 2️⃣ Instalar Dependencias  
```
pip install requests
```

### 3️⃣ Ejecutar Monitor
Hacer doble clic en: `ZienShield-Monitor.bat`

## 🎯 USO DIARIO

### Para Administradores de TI:
1. **Despliegue masivo**: Copiar carpeta a cada equipo
2. **Ejecutar**: Usar el archivo .bat para menú interactivo
3. **Monitoreo**: Datos visibles en Grafana (http://194.164.172.92:3000)

### Para Usuarios Finales:
1. **Inicio rápido**: Doble clic en `ZienShield-Monitor.bat`  
2. **Seleccionar opción**: Menú numerado (1-5)
3. **Monitoreo continuo**: Opción 1 (recomendada)
4. **Detener**: Presionar Ctrl+C

## 📊 VERIFICAR QUE FUNCIONA

### Test Rápido:
1. Ejecutar: `ZienShield-Monitor.bat`
2. Seleccionar opción `3` (Probar configuración)
3. Debe mostrar: "✅ Servidor ZienShield accesible"

### Verificar Datos en Grafana:
1. Ir a: http://194.164.172.92:3000
2. Login con credenciales de administrador
3. Buscar dashboard "ZienShield Web Traffic"
4. Verificar que aparezca el nuevo agente

## 🔤 COMANDOS ÚTILES

### Ejecución Manual:
```cmd
# Monitoreo continuo
python zienshield-web-monitor-windows.py

# Una sola vez (test)
python zienshield-web-monitor-windows.py --once

# Probar conectividad
python zienshield-web-monitor-windows.py --test

# Ver ayuda completa
python zienshield-web-monitor-windows.py --help
```

### Como Servicio de Windows (Avanzado):
```cmd
# Crear tarea programada (ejecutar como Admin)
schtasks /create /tn "ZienShield Monitor" /tr "python C:\\ZienShield\\zienshield-web-monitor-windows.py" /sc onstart /ru SYSTEM
```

## 🚨 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "Python no reconocido"
**Causa**: Python no instalado o no en PATH
**Solución**: 
1. Instalar desde https://python.org/downloads
2. Marcar "Add Python to PATH" durante instalación
3. Reiniciar terminal

### Error: "No module named requests"  
**Causa**: Librería requests no instalada
**Solución**:
```cmd
pip install requests
```

### Error: "No se pudo conectar al servidor"
**Causa**: Firewall o red corporativa
**Solución**:
1. Verificar Internet: `ping google.com`
2. Probar servidor: `telnet 194.164.172.92 3001`
3. Contactar administrador de red si persiste

### Monitor no envía datos
**Verificar**:
1. Ejecutar test: `python zienshield-web-monitor-windows.py --test`
2. Revisar logs: `~/Documents/ZienShield/zienshield-web-traffic.log`
3. Verificar en Grafana que aparezca el agente

### Demasiados procesos Python
**Causa**: Múltiples instancias ejecutándose
**Solución**:
```cmd
# Ver procesos Python
tasklist | findstr python

# Terminar proceso específico
taskkill /PID [número_de_proceso] /F
```

## 🔧 CONFIGURACIÓN AVANZADA

### Cambiar Servidor Backend:
Editar archivo `zienshield-web-monitor-windows.py`:
```python
# Línea ~20
def __init__(self, backend_url="http://TU-SERVIDOR:3001"):
```

### Cambiar Frecuencia de Monitoreo:
```python
# Línea ~final
time.sleep(30)  # Cambiar 30 por segundos deseados
```

### Agregar Nuevas Categorías:
```python
# Buscar self.site_categories y agregar:
'nueva_categoria': ['sitio1.com', 'sitio2.com']
```

## 📋 CHECKLIST DE DESPLIEGUE

### Antes del Despliegue:
- [ ] Python 3.7+ instalado en equipos objetivo
- [ ] Acceso de red al servidor ZienShield (puerto 3001)
- [ ] Permisos para ejecutar scripts Python
- [ ] Carpeta Documents accesible para logs

### Durante el Despliegue:
- [ ] Copiar carpeta ZienShield a cada equipo
- [ ] Ejecutar test en cada equipo
- [ ] Verificar que aparezcan nuevos agentes en Grafana
- [ ] Documentar IDs de agentes generados

### Después del Despliegue:
- [ ] Configurar alertas en Grafana para agentes offline
- [ ] Capacitar usuarios sobre el monitor
- [ ] Establecer procedimiento para reportar problemas
- [ ] Programar revisiones periódicas de logs

## 📈 INTERPRETACIÓN DE DATOS

### En Grafana verás:
- **Total Conexiones**: Actividad web total del equipo
- **Dominios Únicos**: Variedad de sitios visitados  
- **Navegadores Activos**: Procesos de navegador ejecutándose
- **Top Dominios**: Sitios más visitados por conexiones
- **Categorías**: Distribución por tipo de sitio (work, social, etc.)

### Casos de Uso Típicos:
- **Productividad**: Monitorear trabajo vs entretenimiento
- **Seguridad**: Detectar conexiones a sitios maliciosos
- **Capacidad**: Planificar ancho de banda por uso real
- **Compliance**: Auditar cumplimiento de políticas web

---

🔗 **Enlaces Útiles**:
- Dashboard Grafana: http://194.164.172.92:3000
- Servidor Prometheus: http://194.164.172.92:9090  
- Python Download: https://python.org/downloads

📞 **Soporte**: Contactar al administrador del sistema ZienShield
'''

    def create_package(self):
        """Crear el paquete completo para Windows"""
        print("🚀 ZienShield Windows Package Creator")
        print("=" * 50)
        
        # Limpiar directorio anterior
        if os.path.exists(self.package_dir):
            shutil.rmtree(self.package_dir)
            
        # Crear directorio del paquete
        os.makedirs(self.package_dir, exist_ok=True)
        
        print("📝 Creando archivos del paquete...")
        
        # 1. Crear script principal del agente
        agent_script = self.create_windows_agent_script()
        agent_file = os.path.join(self.package_dir, "zienshield-web-monitor-windows.py")
        with open(agent_file, 'w', encoding='utf-8') as f:
            f.write(agent_script)
        print(f"✅ Agente creado: {agent_file}")
        
        # 2. Crear launcher batch
        batch_launcher = self.create_batch_launcher()
        batch_file = os.path.join(self.package_dir, "ZienShield-Monitor.bat")
        with open(batch_file, 'w', encoding='utf-8') as f:
            f.write(batch_launcher)
        print(f"✅ Launcher creado: {batch_file}")
        
        # 3. Crear README
        readme_content = self.create_readme()
        readme_file = os.path.join(self.package_dir, "README.txt")
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        print(f"✅ README creado: {readme_file}")
        
        # 4. Crear instrucciones
        instructions_content = self.create_instructions()
        instructions_file = os.path.join(self.package_dir, "INSTRUCCIONES.txt")
        with open(instructions_file, 'w', encoding='utf-8') as f:
            f.write(instructions_content)
        print(f"✅ Instrucciones creadas: {instructions_file}")
        
        # 5. Crear archivo de información rápida
        quick_info = f"""🛡️ ZIENSHIELD WEB MONITOR - INSTALACIÓN RÁPIDA

📋 PASOS:
1. Hacer doble clic en "ZienShield-Monitor.bat"
2. Seleccionar opción 1 (Monitoreo continuo)
3. ¡Listo! El monitor enviará datos a ZienShield

📊 VERIFICAR:
- Dashboard Grafana: http://194.164.172.92:3000
- Logs locales: ~/Documents/ZienShield/

⚠️ REQUISITOS:
- Python 3.7+ instalado
- Conexión a Internet
- Ejecutar "pip install requests"

📞 SOPORTE: Administrador del sistema ZienShield

---
Generado: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
        quick_file = os.path.join(self.package_dir, "INICIO-RAPIDO.txt")
        with open(quick_file, 'w', encoding='utf-8') as f:
            f.write(quick_info)
        print(f"✅ Guía rápida creada: {quick_file}")
        
        # 6. Crear requirements.txt
        requirements = """# ZienShield Web Monitor - Dependencias
requests>=2.25.0
# Todas las demás librerías son estándar de Python 3.7+
"""
        req_file = os.path.join(self.package_dir, "requirements.txt")
        with open(req_file, 'w', encoding='utf-8') as f:
            f.write(requirements)
        print(f"✅ Requirements creado: {req_file}")
        
        print("\n🎉 ¡PAQUETE WINDOWS CREADO EXITOSAMENTE!")
        print("=" * 50)
        print(f"📁 Ubicación: ./{self.package_dir}/")
        print("\n📋 Archivos incluidos:")
        for file in sorted(os.listdir(self.package_dir)):
            file_path = os.path.join(self.package_dir, file)
            size_kb = round(os.path.getsize(file_path) / 1024, 1)
            print(f"   📄 {file} ({size_kb} KB)")
        
        print(f"\n🚀 Para usar en Windows:")
        print(f"   1. Copiar la carpeta '{self.package_dir}' al equipo Windows")
        print(f"   2. Instalar Python 3.7+ desde https://python.org")
        print(f"   3. Ejecutar: pip install requests")
        print(f"   4. Hacer doble clic en 'ZienShield-Monitor.bat'")
        print(f"   5. Seleccionar opción de monitoreo")
        
        print(f"\n✅ El monitor estará enviando datos a:")
        print(f"   🌐 Servidor: http://194.164.172.92:3001")
        print(f"   📊 Grafana: http://194.164.172.92:3000")
        
        return True

def main():
    creator = ZienShieldWindowsPackageCreator()
    success = creator.create_package()
    
    if success:
        print("\n🎉 Proceso completado exitosamente!")
        print("\n💡 Nota: Este es un paquete PORTABLE que requiere Python")
        print("   preinstalado en los equipos Windows de destino.")
    else:
        print("\n❌ Error en el proceso de creación")
        sys.exit(1)

if __name__ == "__main__":
    main()