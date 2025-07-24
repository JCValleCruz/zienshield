#!/usr/bin/env python3
"""
ZienShield Web Traffic Monitor
Agente para capturar métricas de navegación web y tráfico de red
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

# Importar psutil si está disponible, sino usar métodos alternativos
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("⚠️ psutil no disponible, usando métodos alternativos")

class ZienShieldWebMonitor:
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
            'work': ['office.com', 'google.com', 'gmail.com', 'slack.com', 'zoom.us'],
            'news': ['cnn.com', 'bbc.com', 'reddit.com', 'news.google.com'],
            'shopping': ['amazon.com', 'ebay.com', 'mercadolibre.com'],
            'streaming': ['spotify.com', 'apple.com', 'soundcloud.com']
        }

    def resolve_ip_to_domain(self, ip):
        """Resolver IP a dominio y cachear resultado"""
        if ip in self.domain_cache:
            return self.domain_cache[ip]
        
        try:
            # Resolver IP a hostname
            hostname = socket.gethostbyaddr(ip)[0]
            
            # Extraer dominio principal
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

    def get_active_connections(self):
        """Obtener conexiones de red activas"""
        connections = []
        try:
            # Usar psutil para obtener conexiones de red con información de proceso
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == psutil.CONN_ESTABLISHED and conn.raddr:
                    try:
                        process = psutil.Process(conn.pid) if conn.pid else None
                        process_name = process.name() if process else 'unknown'
                        process_cmdline = ' '.join(process.cmdline()[:3]) if process else 'unknown'
                        
                        connection_info = {
                            'local_ip': conn.laddr.ip,
                            'local_port': conn.laddr.port,
                            'remote_ip': conn.raddr.ip,
                            'remote_port': conn.raddr.port,
                            'pid': conn.pid or 0,
                            'process_name': process_name,
                            'process_cmdline': process_cmdline,
                            'domain': self.resolve_ip_to_domain(conn.raddr.ip)
                        }
                        connections.append(connection_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
        except Exception as e:
            print(f"Error obteniendo conexiones: {e}")
        
        return connections

    def get_network_stats_by_process(self):
        """Obtener estadísticas de red por proceso"""
        stats = {}
        try:
            for proc in psutil.process_iter(['pid', 'name', 'connections']):
                try:
                    process_info = proc.info
                    if process_info['connections']:
                        stats[process_info['pid']] = {
                            'name': process_info['name'],
                            'connections': len(process_info['connections'])
                        }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            print(f"Error obteniendo stats de red: {e}")
        
        return stats

    def categorize_domain(self, domain):
        """Categorizar dominio según tipo de sitio"""
        domain_lower = domain.lower()
        for category, domains in self.site_categories.items():
            for site in domains:
                if site in domain_lower:
                    return category
        return 'other'

    def get_browser_processes(self):
        """Detectar procesos de navegadores activos"""
        browsers = ['chrome', 'firefox', 'safari', 'edge', 'opera', 'brave']
        active_browsers = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_info']):
            try:
                process_info = proc.info
                process_name = process_info['name'].lower()
                
                for browser in browsers:
                    if browser in process_name:
                        active_browsers.append({
                            'browser': browser,
                            'pid': process_info['pid'],
                            'name': process_info['name'],
                            'cmdline': ' '.join(process_info['cmdline'][:3]) if process_info['cmdline'] else '',
                            'cpu_percent': process_info['cpu_percent'],
                            'memory_mb': process_info['memory_info'].rss / 1024 / 1024 if process_info['memory_info'] else 0
                        })
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return active_browsers

    def collect_web_metrics(self):
        """Recopilar todas las métricas web"""
        timestamp = datetime.now().isoformat()
        
        # Obtener conexiones activas
        connections = self.get_active_connections()
        
        # Obtener estadísticas de red por proceso
        network_stats = self.get_network_stats_by_process()
        
        # Obtener navegadores activos
        browsers = self.get_browser_processes()
        
        # Agrupar conexiones por dominio
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
        
        # Estructurar datos para Wazuh
        web_metrics = {
            'timestamp': timestamp,
            'agent_id': os.uname().nodename,
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
            
            # Enviar métricas al backend
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
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error enviando métricas al backend: {e}")
            return False
    
    def send_to_wazuh(self, metrics):
        """Enviar métricas a Wazuh como log estructurado"""
        try:
            # Formatear como log JSON para Wazuh
            log_entry = {
                'zienshield_web_traffic': metrics,
                'rule_id': 100001,  # ID de regla personalizada
                'level': 3,
                'description': 'ZienShield Web Traffic Metrics'
            }
            
            # Escribir a syslog o archivo específico que Wazuh monitorea
            log_message = f"ZienShield-WebTraffic: {json.dumps(log_entry)}"
            
            # Opción 1: Syslog
            try:
                import syslog
                syslog.openlog("zienshield-web-monitor")
                syslog.syslog(syslog.LOG_INFO, log_message)
                syslog.closelog()
            except:
                pass
            
            # Opción 2: Archivo local (recomendado)
            log_file = "/var/log/zienshield-web-traffic.log"
            try:
                with open(log_file, 'a') as f:
                    f.write(f"{log_message}\n")
            except:
                # Fallback a archivo en home si no hay permisos
                log_file = f"{os.path.expanduser('~')}/zienshield-web-traffic.log"
                with open(log_file, 'a') as f:
                    f.write(f"{log_message}\n")
            
            print(f"✅ Métricas enviadas a {log_file}")
            return True
            
        except Exception as e:
            print(f"❌ Error enviando métricas a Wazuh: {e}")
            return False

    def run_monitoring_cycle(self):
        """Ejecutar un ciclo completo de monitoreo"""
        print(f"🔍 Iniciando ciclo de monitoreo web - {datetime.now()}")
        
        try:
            # Recopilar métricas
            metrics = self.collect_web_metrics()
            
            # Mostrar resumen en consola
            print(f"📊 Conexiones activas: {metrics['total_connections']}")
            print(f"📊 Dominios únicos: {metrics['total_domains']}")
            print(f"📊 Navegadores activos: {metrics['active_browsers']}")
            
            if metrics['top_domains']:
                print("📊 Top dominios:")
                for domain, connections in metrics['top_domains'][:5]:
                    print(f"   - {domain}: {connections} conexiones")
            
            # Enviar a ambos destinos
            wazuh_success = self.send_to_wazuh(metrics)
            backend_success = self.send_to_backend(metrics)
            
            return wazuh_success or backend_success
            
        except Exception as e:
            print(f"❌ Error en ciclo de monitoreo: {e}")
            return False

def main():
    """Función principal"""
    print("🚀 ZienShield Web Traffic Monitor iniciado")
    print("=" * 50)
    
    monitor = ZienShieldWebMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        # Ejecutar una sola vez
        monitor.run_monitoring_cycle()
    else:
        # Ejecutar continuamente
        print("⏰ Iniciando monitoreo continuo (cada 30 segundos)")
        print("   Presiona Ctrl+C para detener")
        
        try:
            while True:
                monitor.run_monitoring_cycle()
                print("-" * 30)
                time.sleep(30)
        except KeyboardInterrupt:
            print("\n🛑 Monitoreo detenido por el usuario")
        except Exception as e:
            print(f"❌ Error fatal: {e}")

if __name__ == "__main__":
    main()