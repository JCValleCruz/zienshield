#!/usr/bin/env python3
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
                lines = result.stdout.split('\n')
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
                f.write(f"{log_message}\n\n")
            
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
                print("\n🌐 Navegadores detectados:")
                for browser in metrics['browser_processes']:
                    print(f"   - {browser['name'].title()}: {browser['process_count']} procesos ({browser['memory_mb']} MB)")
            
            # Mostrar top dominios
            if metrics['top_domains']:
                print("\n📊 Top dominios:")
                for domain, connections in metrics['top_domains'][:8]:
                    category = metrics['domain_stats'].get(domain, {}).get('category', 'other')
                    print(f"   - {domain} ({category}): {connections} conexiones")
            
            # Mostrar resumen por categorías
            if metrics['categories_summary']:
                print("\n📈 Por categorías:")
                sorted_categories = sorted(metrics['categories_summary'].items(), 
                                         key=lambda x: x[1]['connections'], reverse=True)
                for category, stats in sorted_categories[:6]:
                    print(f"   - {category.title()}: {stats['connections']} conexiones, {stats['domains']} dominios")
            
            # Enviar al backend
            print("\n🚀 Enviando métricas...")
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
    print("\n" + "="*70)
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
            
            print("\n" + "="*70)
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
            
            print("\n🔍 Probando recopilación de datos...")
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
                print(f"\n🔄 Ciclo #{cycle_count}")
                
                success = monitor.run_monitoring_cycle()
                
                if success:
                    print("✅ Ciclo completado - Esperando 30 segundos...")
                else:
                    print("⚠️ Errores en el ciclo - Esperando 30 segundos...")
                
                print("-"*30)
                time.sleep(30)
                
        except KeyboardInterrupt:
            print("\n\n🛑 MONITOREO DETENIDO POR EL USUARIO")
            print("="*70)
            print(f"📊 Total de ciclos ejecutados: {cycle_count}")
            print("✅ Programa terminado correctamente")
            print("="*70)
        except Exception as e:
            print(f"\n❌ ERROR FATAL: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n👋 Presiona Enter para cerrar...")
        try:
            input()
        except:
            pass

if __name__ == "__main__":
    main()
