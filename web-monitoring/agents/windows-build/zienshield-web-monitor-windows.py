#!/usr/bin/env python3
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
                lines = result.stdout.split('\n')
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
                lines = result.stdout.split('\n')
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
                f.write(f"{log_message}\n")
            
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
            print("\n🚀 Enviando métricas...")
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
            print("\n✅ Monitoreo ejecutado exitosamente!")
        else:
            print("\n❌ Hubo errores en el monitoreo")
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
            print("\n🛑 Monitoreo detenido por el usuario")
        except Exception as e:
            print(f"❌ Error fatal: {e}")
        
        input("\nPresiona Enter para cerrar...")

if __name__ == "__main__":
    main()
