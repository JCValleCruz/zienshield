# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
ZienShield Agent Installer for Windows (Simplified)
Version sin dependencias complejas de Windows
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
import ctypes

class ZienShieldSimpleInstaller:
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
        self.agent_script = os.path.join(self.install_dir, 'zienshield-agent.py')
        self.config_file = os.path.join(self.install_dir, 'config.json')
        self.log_file = os.path.join(self.install_dir, 'logs', 'agent.log')
        self.batch_file = os.path.join(self.install_dir, 'start-agent.bat')

    def check_admin_rights(self):
        """Verificar permisos de administrador"""
        try:
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
            print("ADVERTENCIA: Se recomiendan permisos de administrador")
            print("Continuando con instalacion de usuario...")
            # Cambiar directorio a usuario si no es admin
            self.install_dir = os.path.join(os.path.expanduser('~'), 'ZienShield')
            self.agent_script = os.path.join(self.install_dir, 'zienshield-agent.py')
            self.config_file = os.path.join(self.install_dir, 'config.json')
            self.log_file = os.path.join(self.install_dir, 'logs', 'agent.log')
            self.batch_file = os.path.join(self.install_dir, 'start-agent.bat')
        
        print("OK: Requisitos verificados")
        return True

    def install_dependencies(self):
        """Instalar dependencias de Python"""
        print("Instalando dependencias...")
        
        dependencies = ['psutil', 'requests']
        
        for dep in dependencies:
            try:
                __import__(dep)
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
ZienShield Web Monitoring Agent for Windows (Simple)
"""

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

class ZienShieldSimpleAgent:
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
            'gaming': ['steam.com', 'epic.com', 'battle.net', 'roblox.com']
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
        try:
            system_metrics = {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_usage': psutil.disk_usage('C:').percent,
                'network_sent': psutil.net_io_counters().bytes_sent,
                'network_recv': psutil.net_io_counters().bytes_recv
            }
        except:
            system_metrics = {'error': 'No se pudieron obtener metricas del sistema'}
        
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
                
                timestamp = datetime.now().strftime("%H:%M:%S")
                if success:
                    print(f"[{timestamp}] OK: {metrics['total_connections']} conexiones, {metrics['total_domains']} dominios")
                    
                    # Mostrar top 3 dominios si existen
                    if metrics['top_domains']:
                        top_domains = metrics['top_domains'][:3]
                        domains_str = ', '.join([f"{d[0]}({d[1]})" for d in top_domains])
                        print(f"          Top dominios: {domains_str}")
                else:
                    print(f"[{timestamp}] ERROR: No se pudieron enviar metricas")
                
                time.sleep(30)  # Intervalo de 30 segundos
                
            except KeyboardInterrupt:
                print("\\nAgente detenido por el usuario")
                break
            except Exception as e:
                self.log_error(f"Error en loop principal: {e}")
                print(f"ERROR: {e}")
                time.sleep(60)  # Esperar mas tiempo si hay error

def main():
    config_file = os.path.join(os.path.dirname(__file__), 'config.json')
    
    if not os.path.exists(config_file):
        print("ERROR: Archivo de configuracion no encontrado")
        input("Presiona Enter para salir...")
        sys.exit(1)
    
    agent = ZienShieldSimpleAgent(config_file)
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

    def create_batch_file(self):
        """Crear archivo batch para iniciar el agente"""
        print("Creando archivo de inicio...")
        
        batch_content = f'''@echo off
title ZienShield Web Monitoring Agent
echo Iniciando ZienShield Agent...
cd /d "{self.install_dir}"
python "{self.agent_script}"
pause
'''
        
        try:
            with open(self.batch_file, 'w') as f:
                f.write(batch_content)
            
            print(f"OK: Archivo de inicio creado: {self.batch_file}")
            return True
            
        except Exception as e:
            print(f"ERROR: Error creando archivo batch: {e}")
            return False

    def create_startup_shortcut(self):
        """Crear acceso directo en el menu inicio"""
        try:
            startup_folder = os.path.join(
                os.environ['APPDATA'], 
                'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
            )
            
            if os.path.exists(startup_folder):
                shortcut_content = f'''[InternetShortcut]
URL=file:///{self.batch_file.replace(os.sep, '/')}
'''
                shortcut_path = os.path.join(startup_folder, 'ZienShield Agent.url')
                
                with open(shortcut_path, 'w') as f:
                    f.write(shortcut_content)
                
                print(f"OK: Acceso directo de inicio creado")
                return True
        except Exception as e:
            print(f"ADVERTENCIA: No se pudo crear acceso directo de inicio: {e}")
        
        return False

    def run_installation(self):
        """Ejecutar instalacion completa"""
        print("ZienShield Simple Agent Installer para Windows")
        print("=" * 50)
        
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
        
        if not self.create_batch_file():
            return False
        
        # Crear acceso directo de inicio (opcional)
        self.create_startup_shortcut()
        
        print("\\n" + "=" * 50)
        print("INSTALACION COMPLETADA EXITOSAMENTE!")
        print("=" * 50)
        print(f"Agent ID: {self.agent_id}")
        print(f"Hostname: {self.hostname}")
        print(f"Directorio: {self.install_dir}")
        
        print("\\nPara iniciar el agente:")
        print(f'1. Ejecutar: "{self.batch_file}"')
        print(f'2. O ejecutar: python "{self.agent_script}"')
        
        print("\\nEl agente capturara:")
        print("- Navegacion web en tiempo real")
        print("- Dominios visitados y tiempo conectado")
        print("- Procesos que usan internet")
        print("- Metricas del sistema")
        
        # Preguntar si iniciar ahora
        try:
            start_now = input("\\n¿Iniciar el agente ahora? (s/n): ").lower().strip()
            if start_now in ['s', 'si', 'y', 'yes']:
                print("\\nIniciando agente...")
                os.system(f'start cmd /k "cd /d \\"{self.install_dir}\\" && python \\"{self.agent_script}\\""')
        except:
            pass
        
        return True

def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--help':
        print("""
ZienShield Simple Agent Installer para Windows

Uso: python windows-simple-install.py [opciones]

Opciones:
  --help     Mostrar esta ayuda
  
Requisitos:
  - Python 3.6+
  - Conexion a internet
  - Acceso al servidor ZienShield

Diferencias con la version completa:
  - No requiere permisos de administrador
  - No instala servicio de Windows
  - Funciona como aplicacion de usuario
  - Inicio manual o con acceso directo

El script:
1. Verifica requisitos basicos
2. Instala dependencias minimas (psutil, requests)
3. Enrola el agente en el servidor
4. Crea script de monitoreo
5. Configura inicio facil con archivo .bat
        """)
        return
    
    installer = ZienShieldSimpleInstaller()
    success = installer.run_installation()
    
    if not success:
        print("\\nERROR: Instalacion fallida")
        input("Presiona Enter para salir...")
        sys.exit(1)

if __name__ == "__main__":
    main()