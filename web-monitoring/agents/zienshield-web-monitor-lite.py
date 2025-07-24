#!/usr/bin/env python3
"""
ZienShield Web Traffic Monitor - Lite Version
Versión que usa herramientas del sistema (netstat, ss) sin psutil
"""

import subprocess
import socket
import json
import time
import os
import re
import sys
from datetime import datetime
from collections import defaultdict

class ZienShieldWebMonitorLite:
    def __init__(self):
        self.domain_cache = {}
        
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

    def get_active_connections_netstat(self):
        """Obtener conexiones usando netstat"""
        connections = []
        try:
            # Usar netstat para conexiones establecidas
            cmd = ["netstat", "-tuln", "-p", "2>/dev/null"]
            result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
            
            if result.returncode != 0:
                # Intentar con ss si netstat falla
                return self.get_active_connections_ss()
            
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if 'ESTABLISHED' in line:
                    parts = line.split()
                    if len(parts) >= 4:
                        try:
                            local_addr = parts[3]
                            remote_addr = parts[4]
                            
                            # Extraer IP y puerto
                            if ':' in remote_addr:
                                remote_ip, remote_port = remote_addr.rsplit(':', 1)
                                
                                # Resolver dominio
                                domain = self.resolve_ip_to_domain(remote_ip)
                                
                                connection_info = {
                                    'local_addr': local_addr,
                                    'remote_ip': remote_ip,
                                    'remote_port': int(remote_port),
                                    'domain': domain,
                                    'process_info': parts[-1] if len(parts) > 6 else 'unknown'
                                }
                                connections.append(connection_info)
                        except (ValueError, IndexError):
                            continue
        except Exception as e:
            print(f"Error obteniendo conexiones con netstat: {e}")
        
        return connections

    def get_active_connections_ss(self):
        """Obtener conexiones usando ss (iproute2)"""
        connections = []
        try:
            # Usar ss para conexiones establecidas
            cmd = ["ss", "-tuln", "-p"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                return []
            
            lines = result.stdout.strip().split('\n')
            for line in lines[1:]:  # Saltar header
                if 'ESTAB' in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        try:
                            remote_addr = parts[4]
                            
                            # Extraer IP y puerto
                            if ':' in remote_addr and not remote_addr.startswith('['):
                                remote_ip, remote_port = remote_addr.rsplit(':', 1)
                            elif remote_addr.startswith('['):
                                # IPv6
                                match = re.match(r'\[([^\]]+)\]:(\d+)', remote_addr)
                                if match:
                                    remote_ip, remote_port = match.groups()
                                else:
                                    continue
                            else:
                                continue
                                
                            # Resolver dominio
                            domain = self.resolve_ip_to_domain(remote_ip)
                            
                            connection_info = {
                                'local_addr': parts[3],
                                'remote_ip': remote_ip,
                                'remote_port': int(remote_port),
                                'domain': domain,
                                'process_info': parts[-1] if len(parts) > 5 else 'unknown'
                            }
                            connections.append(connection_info)
                        except (ValueError, IndexError):
                            continue
        except Exception as e:
            print(f"Error obteniendo conexiones con ss: {e}")
        
        return connections

    def get_browser_processes_ps(self):
        """Detectar procesos de navegadores usando ps"""
        browsers = ['chrome', 'firefox', 'safari', 'edge', 'opera', 'brave']
        active_browsers = []
        
        try:
            # Usar ps para obtener procesos
            cmd = ["ps", "aux"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                return []
            
            lines = result.stdout.strip().split('\n')
            for line in lines[1:]:  # Saltar header
                parts = line.split(None, 10)  # Limitar split para preservar comando
                if len(parts) >= 11:
                    try:
                        pid = int(parts[1])
                        cpu = float(parts[2])
                        mem = float(parts[3])
                        command = parts[10].lower()
                        
                        for browser in browsers:
                            if browser in command:
                                active_browsers.append({
                                    'browser': browser,
                                    'pid': pid,
                                    'cpu_percent': cpu,
                                    'memory_percent': mem,
                                    'command': parts[10][:100]  # Truncar comando largo
                                })
                                break
                    except (ValueError, IndexError):
                        continue
        except Exception as e:
            print(f"Error obteniendo procesos de navegadores: {e}")
        
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
        
        # Obtener conexiones activas
        connections = self.get_active_connections_netstat()
        if not connections:
            connections = self.get_active_connections_ss()
        
        # Obtener navegadores activos
        browsers = self.get_browser_processes_ps()
        
        # Agrupar conexiones por dominio
        domain_stats = defaultdict(lambda: {
            'connections': 0,
            'ports': set(),
            'category': 'other'
        })
        
        for conn in connections:
            domain = conn['domain']
            domain_stats[domain]['connections'] += 1
            domain_stats[domain]['ports'].add(conn['remote_port'])
            domain_stats[domain]['category'] = self.categorize_domain(domain)
        
        # Convertir sets a listas para JSON
        for domain in domain_stats:
            domain_stats[domain]['ports'] = list(domain_stats[domain]['ports'])
        
        # Estructurar datos para Wazuh
        web_metrics = {
            'timestamp': timestamp,
            'agent_id': os.uname().nodename,
            'monitor_version': 'lite',
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

    def send_to_wazuh(self, metrics):
        """Enviar métricas a Wazuh como log estructurado"""
        try:
            # Formatear como log JSON para Wazuh
            log_entry = {
                'zienshield_web_traffic': metrics,
                'rule_id': 100001,
                'level': 3,
                'description': 'ZienShield Web Traffic Metrics (Lite)'
            }
            
            log_message = f"ZienShield-WebTraffic-Lite: {json.dumps(log_entry)}"
            
            # Escribir a archivo local
            log_file = f"{os.path.expanduser('~')}/zienshield-web-traffic.log"
            try:
                with open(log_file, 'a') as f:
                    f.write(f"{log_message}\n")
                print(f"✅ Métricas enviadas a {log_file}")
                return True
            except Exception as e:
                print(f"❌ Error escribiendo log: {e}")
                return False
            
        except Exception as e:
            print(f"❌ Error enviando métricas a Wazuh: {e}")
            return False

    def run_monitoring_cycle(self):
        """Ejecutar un ciclo completo de monitoreo"""
        print(f"🔍 Iniciando ciclo de monitoreo web (Lite) - {datetime.now()}")
        
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
            
            if metrics['categories_summary']:
                print("📊 Por categoría:")
                for category, stats in metrics['categories_summary'].items():
                    print(f"   - {category}: {stats['connections']} conexiones, {stats['domains']} dominios")
            
            # Enviar a Wazuh
            success = self.send_to_wazuh(metrics)
            
            return success
            
        except Exception as e:
            print(f"❌ Error en ciclo de monitoreo: {e}")
            return False

def main():
    """Función principal"""
    print("🚀 ZienShield Web Traffic Monitor (Lite Version) iniciado")
    print("=" * 60)
    print("ℹ️  Esta versión usa herramientas del sistema (netstat/ss/ps)")
    print("=" * 60)
    
    monitor = ZienShieldWebMonitorLite()
    
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
                print("-" * 50)
                time.sleep(30)
        except KeyboardInterrupt:
            print("\n🛑 Monitoreo detenido por el usuario")
        except Exception as e:
            print(f"❌ Error fatal: {e}")

if __name__ == "__main__":
    main()