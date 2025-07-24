#!/usr/bin/env python3
"""
ZienShield Windows Installer Builder
Crea un instalador EXE completo para equipos Windows
"""

import os
import shutil
import subprocess
import sys
from datetime import datetime

class ZienShieldWindowsBuilder:
    def __init__(self):
        self.build_dir = "windows-build"
        self.dist_dir = "dist"
        self.installer_name = "ZienShield-WebMonitor-Setup.exe"
        
    def create_windows_agent_script(self):
        """Crear el script del agente optimizado para Windows"""
        agent_script = '''#!/usr/bin/env python3
"""
ZienShield Web Traffic Monitor - Windows Version
Agente para capturar métricas de navegación web en Windows
"""

import subprocess
import socket
import json
import time
import os
import re
import sys
import requests
from datetime import datetime
from collections import defaultdict
import platform

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
            'social': ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com'],
            'video': ['youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'dailymotion.com'],
            'work': ['office.com', 'google.com', 'gmail.com', 'slack.com', 'zoom.us', 'teams.microsoft.com'],
            'news': ['cnn.com', 'bbc.com', 'reddit.com', 'news.google.com'],
            'shopping': ['amazon.com', 'ebay.com', 'mercadolibre.com'],
            'streaming': ['spotify.com', 'apple.com', 'soundcloud.com']
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
            result = subprocess.run(['netstat', '-an'], capture_output=True, text=True, timeout=10)
            
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
                                        
                                        # Filtrar conexiones locales
                                        if not remote_ip.startswith('127.') and not remote_ip.startswith('192.168.') and not remote_ip.startswith('10.'):
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
                            except Exception as e:
                                continue
                                
        except Exception as e:
            print(f"Error obteniendo conexiones: {e}")
        
        return connections

    def get_browser_processes_windows(self):
        """Detectar procesos de navegadores usando tasklist en Windows"""
        browsers = ['chrome.exe', 'firefox.exe', 'msedge.exe', 'iexplore.exe', 'opera.exe', 'brave.exe']
        active_browsers = []
        
        try:
            # Usar tasklist para obtener procesos
            result = subprocess.run(['tasklist', '/FO', 'CSV'], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                lines = result.stdout.split('\\n')
                browser_counts = defaultdict(int)
                
                for line in lines[1:]:  # Saltar header
                    if line.strip():
                        try:
                            # Parsear CSV (formato: "nombre","PID","Session","Mem Usage")
                            parts = [p.strip('"') for p in line.split('","')]
                            if len(parts) >= 2:
                                process_name = parts[0].lower()
                                
                                for browser_exe in browsers:
                                    if browser_exe in process_name:
                                        browser_name = browser_exe.replace('.exe', '')
                                        browser_counts[browser_name] += 1
                                        break
                        except:
                            continue
                
                # Convertir a formato esperado
                for browser, count in browser_counts.items():
                    active_browsers.append({
                        'browser': browser,
                        'pid': 0,
                        'name': browser,
                        'cmdline': f'{browser} process',
                        'cpu_percent': 0.0,
                        'memory_mb': 0.0
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
            agent_id = f"{platform.node()}-{platform.system()}-{hash(platform.processor()) % 100000}"
        except:
            agent_id = f"windows-agent-{hash(os.environ.get('COMPUTERNAME', 'unknown')) % 100000}"
        
        # Estructurar datos para el backend
        web_metrics = {
            'timestamp': timestamp,
            'agent_id': agent_id,
            'hostname': platform.node(),
            'os_info': {
                'system': platform.system(),
                'release': platform.release(),
                'version': platform.version()
            },
            'total_connections': len(connections),
            'total_domains': len(domain_stats),
            'active_browsers': len(browsers),
            'domain_stats': dict(domain_stats),
            'browser_processes': browsers,
            'top_domains': sorted(
                [(domain, stats['connections']) for domain, stats in domain_stats.items()],
                key=lambda x: x[1],
                reverse=True
            )[:10],
            'categories_summary': self.get_category_summary(domain_stats)
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
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Métricas enviadas al backend ZienShield")
                return True
            else:
                print(f"⚠️ Backend respondió con código {response.status_code}")
                print(f"   Respuesta: {response.text[:200]}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error enviando métricas al backend: {e}")
            return False
    
    def save_local_log(self, metrics):
        """Guardar métricas en log local como backup"""
        try:
            log_file = os.path.join(os.path.expanduser('~'), 'zienshield-web-traffic.log')
            log_entry = {
                'zienshield_web_traffic': metrics,
                'rule_id': 100001,
                'level': 3,
                'description': 'ZienShield Web Traffic Metrics (Windows)'
            }
            
            log_message = f"ZienShield-Windows: {json.dumps(log_entry)}"
            
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"{log_message}\\n")
            
            print(f"💾 Backup guardado en {log_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error guardando backup: {e}")
            return False

    def run_monitoring_cycle(self):
        """Ejecutar un ciclo completo de monitoreo"""
        print(f"🔍 Iniciando ciclo de monitoreo web - {datetime.now()}")
        print("=" * 60)
        
        try:
            # Recopilar métricas
            metrics = self.collect_web_metrics()
            
            # Mostrar resumen en consola
            print(f"📊 Agente: {metrics['agent_id']}")
            print(f"📊 Sistema: {metrics['os_info']['system']} {metrics['os_info']['release']}")
            print(f"📊 Conexiones activas: {metrics['total_connections']}")
            print(f"📊 Dominios únicos: {metrics['total_domains']}")
            print(f"📊 Navegadores activos: {metrics['active_browsers']}")
            
            if metrics['top_domains']:
                print("📊 Top dominios:")
                for domain, connections in metrics['top_domains'][:5]:
                    print(f"   - {domain}: {connections} conexiones")
            
            # Enviar al backend
            print("\\n🚀 Enviando métricas...")
            backend_success = self.send_to_backend(metrics)
            
            # Guardar backup local
            backup_success = self.save_local_log(metrics)
            
            if backend_success:
                print("✅ Integración con ZienShield completada")
            else:
                print("⚠️ Error en integración con ZienShield (backup local guardado)")
            
            return backend_success or backup_success
            
        except Exception as e:
            print(f"❌ Error en ciclo de monitoreo: {e}")
            return False

def main():
    """Función principal"""
    print("🚀 ZienShield Web Traffic Monitor (Windows)")
    print("=" * 60)
    print(f"📅 Versión: 1.0 - {datetime.now().strftime('%Y-%m-%d')}")
    print(f"💻 Sistema: {platform.system()} {platform.release()}")
    print("=" * 60)
    
    monitor = ZienShieldWebMonitorWindows()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        # Ejecutar una sola vez
        success = monitor.run_monitoring_cycle()
        if success:
            print("\\n✅ Monitoreo ejecutado exitosamente!")
        else:
            print("\\n❌ Hubo errores en el monitoreo")
    elif len(sys.argv) > 1 and sys.argv[1] == '--install-service':
        print("🔧 Instalando como servicio de Windows...")
        print("   (Funcionalidad disponible en versión futura)")
    else:
        # Ejecutar continuamente
        print("⏰ Iniciando monitoreo continuo (cada 30 segundos)")
        print("   Presiona Ctrl+C para detener")
        print("   Logs se guardan en: ~/zienshield-web-traffic.log")
        print("-" * 60)
        
        try:
            while True:
                monitor.run_monitoring_cycle()
                print("-" * 30)
                time.sleep(30)
        except KeyboardInterrupt:
            print("\\n🛑 Monitoreo detenido por el usuario")
        except Exception as e:
            print(f"❌ Error fatal: {e}")
        
        input("\\nPresiona Enter para cerrar...")

if __name__ == "__main__":
    main()
'''
        
        return agent_script

    def create_installer_script(self):
        """Crear script de instalación para Windows"""
        installer_script = '''@echo off
title ZienShield Web Monitor - Instalador
color 0A

echo.
echo ========================================
echo   ZienShield Web Monitor - Instalador
echo ========================================
echo.

:: Verificar privilegios de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Este instalador requiere privilegios de administrador
    echo    Haz clic derecho y selecciona "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo ✅ Privilegios de administrador verificados
echo.

:: Crear directorio de instalación
set INSTALL_DIR=C:\\Program Files\\ZienShield\\WebMonitor
echo 📁 Creando directorio de instalación: %INSTALL_DIR%
mkdir "%INSTALL_DIR%" 2>nul

:: Copiar archivos
echo 📋 Copiando archivos del programa...
copy zienshield-web-monitor-windows.exe "%INSTALL_DIR%\\" >nul
copy README.txt "%INSTALL_DIR%\\" >nul

:: Crear acceso directo en el escritorio
echo 🔗 Creando acceso directo en el escritorio...
set DESKTOP=%USERPROFILE%\\Desktop
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\\ZienShield Monitor.lnk'); $s.TargetPath = '%INSTALL_DIR%\\zienshield-web-monitor-windows.exe'; $s.Save()"

:: Crear entrada en el menú inicio
echo 📌 Creando entrada en el menú inicio...
set START_MENU=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs
mkdir "%START_MENU%\\ZienShield" 2>nul
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%START_MENU%\\ZienShield\\ZienShield Web Monitor.lnk'); $s.TargetPath = '%INSTALL_DIR%\\zienshield-web-monitor-windows.exe'; $s.Save()"

:: Crear script de desinstalación
echo 🗑️ Creando desinstalador...
(
echo @echo off
echo title ZienShield Web Monitor - Desinstalador
echo.
echo Desinstalando ZienShield Web Monitor...
echo.
echo Eliminando archivos...
echo rmdir /s /q "%INSTALL_DIR%"
echo.
echo Eliminando accesos directos...
echo del "%DESKTOP%\\ZienShield Monitor.lnk" 2^>nul
echo rmdir /s /q "%START_MENU%\\ZienShield" 2^>nul
echo.
echo ✅ Desinstalación completada
echo.
echo pause
) > "%INSTALL_DIR%\\uninstall.bat"

:: Agregar a programas instalados (registro)
echo 📝 Registrando en programas instalados...
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ZienShieldWebMonitor" /v "DisplayName" /t REG_SZ /d "ZienShield Web Monitor" /f >nul
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ZienShieldWebMonitor" /v "DisplayVersion" /t REG_SZ /d "1.0" /f >nul
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ZienShieldWebMonitor" /v "Publisher" /t REG_SZ /d "ZienShield Security" /f >nul
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ZienShieldWebMonitor" /v "UninstallString" /t REG_SZ /d "%INSTALL_DIR%\\uninstall.bat" /f >nul

echo.
echo ========================================
echo ✅ INSTALACIÓN COMPLETADA EXITOSAMENTE
echo ========================================
echo.
echo 📍 Ubicación: %INSTALL_DIR%
echo 🖥️ Acceso directo creado en el escritorio
echo 📌 Disponible en el menú inicio
echo.
echo Para ejecutar el monitor:
echo   - Doble clic en el acceso directo del escritorio
echo   - O busca "ZienShield" en el menú inicio
echo.
echo ℹ️ El programa enviará métricas de navegación web a ZienShield
echo    para monitoreo de seguridad y análisis de tráfico.
echo.
pause
'''
        return installer_script

    def create_readme(self):
        """Crear archivo README"""
        readme_content = f'''# ZienShield Web Monitor

## Descripción
Monitor de tráfico web para ZienShield Security Platform.
Este programa recopila métricas de navegación web y las envía al sistema ZienShield para análisis de seguridad.

## Información de la Instalación
- Fecha de compilación: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
- Versión: 1.0
- Compatible con: Windows 7, 8, 10, 11

## Qué hace este programa:
✅ Monitorea conexiones de red activas
✅ Detecta navegadores web en ejecución
✅ Categoriza sitios web visitados
✅ Envía métricas al servidor ZienShield
✅ Guarda logs locales como backup

## Cómo usar:
1. Ejecutar "ZienShield Monitor" desde el escritorio
2. El programa iniciará automáticamente el monitoreo
3. Presionar Ctrl+C para detener

## Modos de ejecución:
- Monitoreo continuo: zienshield-web-monitor-windows.exe
- Una sola vez: zienshield-web-monitor-windows.exe --once

## Archivos de log:
- Ubicación: ~/zienshield-web-traffic.log
- Formato: JSON estructurado
- Backup local de todas las métricas

## Conexión al servidor:
- Servidor: http://194.164.172.92:3001
- Endpoint: /agent-metrics
- Protocolo: HTTP POST con JSON

## Privacidad y Seguridad:
- Solo recopila metadatos de conexiones de red
- No captura contenido de navegación
- No accede a datos personales
- Solo dominios y estadísticas de conexión

## Soporte Técnico:
- Sistema ZienShield Security Platform
- Más información: contacta al administrador de TI

## Desinstalación:
1. Panel de Control → Programas → ZienShield Web Monitor → Desinstalar
2. O ejecutar: C:\\Program Files\\ZienShield\\WebMonitor\\uninstall.bat

---
© 2025 ZienShield Security Platform
'''
        return readme_content

    def install_pyinstaller(self):
        """Instalar PyInstaller si no está disponible"""
        try:
            import PyInstaller
            print("✅ PyInstaller ya está instalado")
            return True
        except ImportError:
            print("📦 Instalando PyInstaller...")
            try:
                subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], check=True)
                print("✅ PyInstaller instalado correctamente")
                return True
            except subprocess.CalledProcessError:
                print("❌ Error instalando PyInstaller")
                return False

    def build_installer(self):
        """Construir el instalador completo"""
        print("🚀 ZienShield Windows Installer Builder")
        print("=" * 50)
        
        # Limpiar directorios anteriores
        if os.path.exists(self.build_dir):
            shutil.rmtree(self.build_dir)
        if os.path.exists(self.dist_dir):
            shutil.rmtree(self.dist_dir)
            
        # Crear directorio de build
        os.makedirs(self.build_dir, exist_ok=True)
        
        print("📝 Creando archivos del agente...")
        
        # 1. Crear script del agente para Windows
        agent_script = self.create_windows_agent_script()
        agent_file = os.path.join(self.build_dir, "zienshield-web-monitor-windows.py")
        with open(agent_file, 'w', encoding='utf-8') as f:
            f.write(agent_script)
        print(f"✅ Agente creado: {agent_file}")
        
        # 2. Instalar PyInstaller
        if not self.install_pyinstaller():
            return False
        
        # 3. Crear requirements.txt
        requirements = """requests>=2.25.0
"""
        req_file = os.path.join(self.build_dir, "requirements.txt")
        with open(req_file, 'w') as f:
            f.write(requirements)
        
        # 4. Compilar con PyInstaller
        print("🔨 Compilando ejecutable con PyInstaller...")
        try:
            pyinstaller_cmd = [
                sys.executable, '-m', 'PyInstaller',
                '--onefile',                    # Un solo archivo
                '--windowed',                   # Sin consola (opcional)
                '--icon=NONE',                  # Sin ícono por ahora
                '--name=zienshield-web-monitor-windows',
                '--distpath', self.dist_dir,
                '--workpath', os.path.join(self.build_dir, 'build'),
                '--specpath', self.build_dir,
                agent_file
            ]
            
            result = subprocess.run(pyinstaller_cmd, cwd=self.build_dir, capture_output=True, text=True)
            
            if result.returncode != 0:
                print("❌ Error en PyInstaller:")
                print(result.stderr)
                return False
                
            print("✅ Ejecutable compilado correctamente")
            
        except Exception as e:
            print(f"❌ Error compilando: {e}")
            return False
        
        # 5. Crear script de instalación
        print("📦 Creando instalador...")
        installer_script = self.create_installer_script()
        installer_file = os.path.join(self.dist_dir, "install.bat")
        with open(installer_file, 'w', encoding='utf-8') as f:
            f.write(installer_script)
        
        # 6. Crear README
        readme_content = self.create_readme()
        readme_file = os.path.join(self.dist_dir, "README.txt")
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        # 7. Crear el paquete final
        print("📦 Creando paquete de instalación...")
        
        final_installer_dir = "ZienShield-WebMonitor-Installer"
        if os.path.exists(final_installer_dir):
            shutil.rmtree(final_installer_dir)
        os.makedirs(final_installer_dir)
        
        # Copiar archivos al paquete final
        exe_file = os.path.join(self.dist_dir, "zienshield-web-monitor-windows.exe")
        if os.path.exists(exe_file):
            shutil.copy2(exe_file, final_installer_dir)
            shutil.copy2(installer_file, final_installer_dir)
            shutil.copy2(readme_file, final_installer_dir)
            
            # Crear archivo de información
            info_file = os.path.join(final_installer_dir, "INSTALACION.txt")
            with open(info_file, 'w', encoding='utf-8') as f:
                f.write(f"""# ZienShield Web Monitor - Instalador

## Para instalar en Windows:

1. **Ejecutar como Administrador**: 
   - Clic derecho en "install.bat"
   - Seleccionar "Ejecutar como administrador"

2. **Seguir las instrucciones** en pantalla

3. **Ubicación final**: 
   - Programa: C:\\Program Files\\ZienShield\\WebMonitor\\
   - Acceso directo: Escritorio y Menú Inicio

## Archivos incluidos:
- zienshield-web-monitor-windows.exe (Programa principal)
- install.bat (Instalador)
- README.txt (Documentación completa)

## Compilado el: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Servidor configurado: http://194.164.172.92:3001

---
Para soporte técnico, contacta al administrador de ZienShield
""")
            
            print("🎉 ¡INSTALADOR CREADO EXITOSAMENTE!")
            print("=" * 50)
            print(f"📁 Ubicación: ./{final_installer_dir}/")
            print("📋 Archivos incluidos:")
            for file in os.listdir(final_installer_dir):
                print(f"   - {file}")
            print()
            print("🚀 Para usar en Windows:")
            print(f"   1. Copiar la carpeta '{final_installer_dir}' al equipo Windows")
            print("   2. Ejecutar 'install.bat' como Administrador")
            print("   3. Seguir las instrucciones de instalación")
            print()
            print("✅ El programa estará listo para monitorear tráfico web")
            
            return True
        else:
            print("❌ No se encontró el ejecutable compilado")
            return False

def main():
    builder = ZienShieldWindowsBuilder()
    success = builder.build_installer()
    
    if success:
        print("\n🎉 Proceso completado exitosamente!")
    else:
        print("\n❌ Error en el proceso de construcción")
        sys.exit(1)

if __name__ == "__main__":
    main()