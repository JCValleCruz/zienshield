# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
ZienShield Agent Installer for Windows
Script optimizado para instalacion en equipos Windows
"""

import os
import sys
import subprocess
import platform
import json
import requests
import shutil
import tempfile
from datetime import datetime
import uuid
import winreg
import win32service
import win32serviceutil
import win32api

class ZienShieldWindowsInstaller:
    def __init__(self):
        self.agent_id = str(uuid.uuid4())
        self.hostname = platform.node()
        self.os_info = {
            'system': platform.system(),
            'release': platform.release(),
            'version': platform.version(),
            'machine': platform.machine()
        }
        
        # Configuracion del servidor ZienShield
        self.server_config = {
            'url': 'http://194.164.172.92:3001',
            'enrollment_endpoint': '/api/web-traffic/enroll',
            'metrics_endpoint': '/api/web-traffic/metrics'
        }
        
        # Rutas de instalacion Windows
        self.install_dir = os.path.join(os.environ.get('PROGRAMFILES', 'C:\\Program Files'), 'ZienShield')
        self.service_name = 'ZienShieldWebMonitor'
        self.agent_script = os.path.join(self.install_dir, 'zienshield-agent.py')
        self.config_file = os.path.join(self.install_dir, 'config.json')
        self.log_file = os.path.join(self.install_dir, 'logs', 'agent.log')

    def check_admin_rights(self):
        """Verificar permisos de administrador"""
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin()
        except:
            return False

    def check_requirements(self):
        """Verificar requisitos del sistema"""
        print("Verificando requisitos del sistema...")
        
        # Verificar Python
        if sys.version_info < (3, 6):
            print("ERROR: Se requiere Python 3.6 o superior")
            return False
        
        # Verificar permisos de administrador
        if not self.check_admin_rights():
            print("ERROR: Se requieren permisos de administrador")
            print("Ejecutar PowerShell como Administrador")
            return False
        
        print("OK: Requisitos verificados")
        return True

    def install_dependencies(self):
        """Instalar dependencias de Python"""
        print("Instalando dependencias...")
        
        dependencies = ['psutil', 'requests', 'pywin32']
        
        for dep in dependencies:
            try:
                __import__(dep.replace('-', '_'))
                print(f"OK: {dep} ya esta instalado")
            except ImportError:
                print(f"Instalando {dep}...")
                try:
                    subprocess.check_call([sys.executable, '-m', 'pip', 'install', dep])
                    print(f"OK: {dep} instalado correctamente")
                except subprocess.CalledProcessError:
                    print(f"ERROR: Error instalando {dep}")
                    return False
        
        return True

    def create_directories(self):
        """Crear directorios necesarios"""
        print("Creando directorios...")
        
        directories = [
            self.install_dir,
            os.path.join(self.install_dir, 'logs'),
            os.path.join(self.install_dir, 'data')
        ]
        
        for directory in directories:
            try:
                os.makedirs(directory, exist_ok=True)
                print(f"OK: Directorio creado: {directory}")
            except Exception as e:
                print(f"ERROR: Error creando directorio {directory}: {e}")
                return False
        
        return True

    def enroll_agent(self):
        """Enrolar agente en el servidor ZienShield"""
        print("Enrolando agente en servidor ZienShield...")
        
        enrollment_data = {
            'agent_id': self.agent_id,
            'hostname': self.hostname,
            'os_info': self.os_info,
            'enrollment_time': datetime.now().isoformat(),
            'agent_version': '1.0.0'
        }
        
        try:
            response = requests.post(
                f"{self.server_config['url']}{self.server_config['enrollment_endpoint']}",
                json=enrollment_data,
                timeout=30
            )
            
            if response.status_code == 200:
                enrollment_response = response.json()
                print("OK: Agente enrolado exitosamente")
                print(f"   Agent ID: {self.agent_id}")
                print(f"   Hostname: {self.hostname}")
                return enrollment_response
            else:
                print(f"ERROR: Error en enrolamiento: {response.status_code}")
                print(f"   Respuesta: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"ERROR: Error conectando al servidor: {e}")
            print("   Verificar que el servidor ZienShield este disponible")
            return None

    def create_agent_script(self):
        """Crear script del agente"""
        print("Creando script del agente...")
        
        agent_code = '''# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
ZienShield Web Monitoring Agent for Windows
"""

import subprocess
import socket
import json
import time
import os
import sys
import platform
import requests
from datetime import datetime
from collections import defaultdict
import psutil

class ZienShieldWindowsAgent:
    def __init__(self, config_file):
        # Cargar configuracion
        with open(config_file, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.agent_id = self.config['agent_id']
        self.hostname = self.config['hostname']
        self.server_url = self.config['server_url']
        self.metrics_endpoint = self.config['metrics_endpoint']
        
        # Cache y datos locales
        self.domain_cache = {}
        self.session_start = datetime.now()
        
        # Categorias de sitios
        self.site_categories = {
            'social': ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com'],
            'video': ['youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'hulu.com'],
            'work': ['office.com', 'google.com', 'gmail.com', 'slack.com', 'zoom.us', 'teams.microsoft.com'],
            'news': ['cnn.com', 'bbc.com', 'reddit.com', 'news.google.com'],
            'shopping': ['amazon.com', 'ebay.com', 'mercadolibre.com'],
            'streaming': ['spotify.com', 'apple.com', 'soundcloud.com'],
            'gaming': ['steam.com', 'epic.com', 'battle.net']
        }

    def resolve_ip_to_domain(self, ip):
        """Resolver IP a dominio con cache"""
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

    def get_network_connections(self):
        """Obtener conexiones de red activas"""
        connections = []
        try:
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == psutil.CONN_ESTABLISHED and conn.raddr:
                    try:
                        process = psutil.Process(conn.pid) if conn.pid else None
                        process_name = process.name() if process else 'unknown'
                        
                        connection_info = {
                            'local_ip': conn.laddr.ip,
                            'local_port': conn.laddr.port,
                            'remote_ip': conn.raddr.ip,
                            'remote_port': conn.raddr.port,
                            'pid': conn.pid or 0,
                            'process_name': process_name,
                            'domain': self.resolve_ip_to_domain(conn.raddr.ip),
                            'timestamp': datetime.now().isoformat()
                        }
                        connections.append(connection_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
        except Exception as e:
            self.log_error(f"Error getting connections: {e}")
        
        return connections

    def categorize_domain(self, domain):
        """Categorizar dominio"""
        domain_lower = domain.lower()
        for category, domains in self.site_categories.items():
            for site in domains:
                if site in domain_lower:
                    return category
        return 'other'

    def get_browser_processes(self):
        """Detectar navegadores activos"""
        browsers = ['chrome', 'firefox', 'msedge', 'iexplore', 'opera', 'brave']
        active_browsers = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
            try:
                process_info = proc.info
                process_name = process_info['name'].lower()
                
                for browser in browsers:
                    if browser in process_name:
                        active_browsers.append({
                            'browser': browser,
                            'pid': process_info['pid'],
                            'name': process_info['name'],
                            'cpu_percent': process_info['cpu_percent'] or 0,
                            'memory_mb': round(process_info['memory_info'].rss / 1024 / 1024, 2) if process_info['memory_info'] else 0
                        })
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return active_browsers

    def collect_metrics(self):
        """Recopilar metricas completas"""
        timestamp = datetime.now().isoformat()
        connections = self.get_network_connections()
        browsers = self.get_browser_processes()
        
        # Agrupar por dominio
        domain_stats = defaultdict(lambda: {
            'connections': 0,
            'processes': set(),
            'ports': set(),
            'category': 'other',
            'first_seen': timestamp,
            'last_seen': timestamp
        })
        
        for conn in connections:
            domain = conn['domain']
            domain_stats[domain]['connections'] += 1
            domain_stats[domain]['processes'].add(conn['process_name'])
            domain_stats[domain]['ports'].add(conn['remote_port'])
            domain_stats[domain]['category'] = self.categorize_domain(domain)
            domain_stats[domain]['last_seen'] = timestamp
        
        # Convertir sets a listas
        for domain in domain_stats:
            domain_stats[domain]['processes'] = list(domain_stats[domain]['processes'])
            domain_stats[domain]['ports'] = list(domain_stats[domain]['ports'])
        
        # Metricas del sistema
        system_metrics = {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_usage': psutil.disk_usage('C:').percent,
            'network_sent': psutil.net_io_counters().bytes_sent,
            'network_recv': psutil.net_io_counters().bytes_recv
        }
        
        metrics = {
            'timestamp': timestamp,
            'agent_id': self.agent_id,
            'hostname': self.hostname,
            'session_duration_minutes': (datetime.now() - self.session_start).total_seconds() / 60,
            'total_connections': len(connections),
            'total_domains': len(domain_stats),
            'active_browsers': len(browsers),
            'domain_stats': dict(domain_stats),
            'browser_processes': browsers,
            'system_metrics': system_metrics,
            'top_domains': sorted(
                [(domain, stats['connections']) for domain, stats in domain_stats.items()],
                key=lambda x: x[1], reverse=True
            )[:10],
            'category_summary': self.get_category_summary(domain_stats)
        }
        
        return metrics

    def get_category_summary(self, domain_stats):
        """Resumen por categorias"""
        categories = defaultdict(lambda: {'domains': 0, 'connections': 0})
        for domain, stats in domain_stats.items():
            category = stats['category']
            categories[category]['domains'] += 1
            categories[category]['connections'] += stats['connections']
        return dict(categories)

    def send_metrics_to_server(self, metrics):
        """Enviar metricas al servidor ZienShield"""
        try:
            response = requests.post(
                f"{self.server_url}{self.metrics_endpoint}",
                json=metrics,
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                print(f"OK: Metricas enviadas - {datetime.now()}")
                return True
            else:
                self.log_error(f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_error(f"Error enviando metricas: {e}")
            return False

    def log_error(self, message):
        """Log de errores"""
        log_file = os.path.join(os.path.dirname(__file__), 'logs', 'agent.log')
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"{datetime.now()}: {message}\\n")
        except:
            print(f"Error logging: {message}")

    def run_monitoring_loop(self):
        """Loop principal de monitoreo"""
        print(f"ZienShield Agent iniciado - {self.hostname} ({self.agent_id})")
        
        while True:
            try:
                metrics = self.collect_metrics()
                success = self.send_metrics_to_server(metrics)
                
                if success:
                    print(f"Metricas: {metrics['total_connections']} conexiones, {metrics['total_domains']} dominios")
                
                time.sleep(30)  # Intervalo de 30 segundos
                
            except KeyboardInterrupt:
                print("\\nAgente detenido")
                break
            except Exception as e:
                self.log_error(f"Error en loop principal: {e}")
                time.sleep(60)  # Esperar mas tiempo si hay error

def main():
    config_file = os.path.join(os.path.dirname(__file__), 'config.json')
    
    if not os.path.exists(config_file):
        print("ERROR: Archivo de configuracion no encontrado")
        sys.exit(1)
    
    agent = ZienShieldWindowsAgent(config_file)
    agent.run_monitoring_loop()

if __name__ == "__main__":
    main()
'''
        
        try:
            with open(self.agent_script, 'w', encoding='utf-8') as f:
                f.write(agent_code)
            
            print(f"OK: Script del agente creado: {self.agent_script}")
            return True
            
        except Exception as e:
            print(f"ERROR: Error creando script: {e}")
            return False

    def create_config_file(self, enrollment_response):
        """Crear archivo de configuracion"""
        print("Creando archivo de configuracion...")
        
        config = {
            'agent_id': self.agent_id,
            'hostname': self.hostname,
            'server_url': self.server_config['url'],
            'metrics_endpoint': self.server_config['metrics_endpoint'],
            'enrollment_time': datetime.now().isoformat(),
            'os_info': self.os_info,
            'version': '1.0.0'
        }
        
        if enrollment_response:
            config.update(enrollment_response.get('server_config', {}))
        
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            print(f"OK: Configuracion guardada: {self.config_file}")
            return True
            
        except Exception as e:
            print(f"ERROR: Error creando configuracion: {e}")
            return False

    def install_windows_service(self):
        """Instalar servicio de Windows"""
        print("Instalando servicio de Windows...")
        
        # Crear script del servicio
        service_script = f'''# -*- coding: utf-8 -*-
import win32serviceutil
import win32service
import win32event
import subprocess
import os
import sys

class ZienShieldService(win32serviceutil.ServiceFramework):
    _svc_name_ = "{self.service_name}"
    _svc_display_name_ = "ZienShield Web Monitor"
    _svc_description_ = "ZienShield Web Traffic Monitoring Agent"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.process = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        if self.process:
            self.process.terminate()
        win32event.SetEvent(self.hWaitStop)

    def SvcDoRun(self):
        try:
            self.process = subprocess.Popen([
                sys.executable, r"{self.agent_script}"
            ], cwd=r"{self.install_dir}")
            
            win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)
        except Exception as e:
            import servicemanager
            servicemanager.LogErrorMsg(f"Error en servicio: {{e}}")

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(ZienShieldService)
'''
        
        service_file = os.path.join(self.install_dir, 'service.py')
        try:
            with open(service_file, 'w', encoding='utf-8') as f:
                f.write(service_script)
            
            # Instalar servicio
            subprocess.run([
                sys.executable, service_file, 'install'
            ], check=True, cwd=self.install_dir)
            
            print("OK: Servicio de Windows instalado")
            return True
            
        except Exception as e:
            print(f"ERROR: Error instalando servicio Windows: {e}")
            return False

    def start_service(self):
        """Iniciar el servicio"""
        print("Iniciando servicio...")
        
        try:
            subprocess.run(['sc', 'start', self.service_name], check=True)
            print("OK: Servicio iniciado correctamente")
            return True
            
        except Exception as e:
            print(f"ERROR: Error iniciando servicio: {e}")
            print("Ejecutar manualmente para pruebas:")
            print(f"python \"{self.agent_script}\"")
            return False

    def run_installation(self):
        """Ejecutar instalacion completa"""
        print("ZienShield Agent Installer para Windows")
        print("=" * 40)
        
        # Verificar requisitos
        if not self.check_requirements():
            return False
        
        # Instalar dependencias
        if not self.install_dependencies():
            return False
        
        # Crear directorios
        if not self.create_directories():
            return False
        
        # Enrolar agente
        enrollment_response = self.enroll_agent()
        
        # Crear archivos
        if not self.create_agent_script():
            return False
        
        if not self.create_config_file(enrollment_response):
            return False
        
        # Instalar servicio
        if not self.install_windows_service():
            print("ADVERTENCIA: Servicio no instalado, pero agente esta listo")
        
        # Iniciar servicio
        if not self.start_service():
            print("ADVERTENCIA: Servicio no iniciado automaticamente")
            print(f"Ejecutar manualmente: python \"{self.agent_script}\"")
        
        print("\\nInstalacion completada exitosamente!")
        print(f"Agent ID: {self.agent_id}")
        print(f"Hostname: {self.hostname}")
        print(f"Install Dir: {self.install_dir}")
        print(f"Log File: {self.log_file}")
        
        return True

def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--help':
        print("""
ZienShield Agent Installer para Windows

Uso: python windows-install-agent.py [opciones]

Opciones:
  --help     Mostrar esta ayuda
  
Requisitos:
  - Python 3.6+
  - Permisos de administrador
  - Conexion al servidor ZienShield

El script:
1. Verifica requisitos del sistema
2. Instala dependencias de Python
3. Enrola el agente en el servidor
4. Instala el agente como servicio de Windows
5. Inicia el monitoreo automatico
        """)
        return
    
    installer = ZienShieldWindowsInstaller()
    success = installer.run_installation()
    
    if not success:
        print("ERROR: Instalacion fallida")
        input("Presionar Enter para continuar...")
        sys.exit(1)
    else:
        print("\\nInstalacion exitosa! El agente esta enviando metricas al servidor.")
        input("Presionar Enter para continuar...")

if __name__ == "__main__":
    main()