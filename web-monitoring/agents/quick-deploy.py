#!/usr/bin/env python3
"""
ZienShield Quick Deploy Tool
Herramienta para despliegue rápido de agentes en múltiples hosts
"""

import os
import sys
import json
import subprocess
import threading
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

class ZienShieldQuickDeploy:
    def __init__(self):
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.deploy_script = os.path.join(self.script_dir, 'deploy-agent.sh')
        self.results = {}
        self.lock = threading.Lock()

    def load_hosts_file(self, hosts_file):
        """Cargar archivo de hosts"""
        hosts = []
        try:
            with open(hosts_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        # Formato: host:user:port:key_file
                        parts = line.split(':')
                        host_config = {
                            'host': parts[0],
                            'user': parts[1] if len(parts) > 1 else 'root',
                            'port': parts[2] if len(parts) > 2 else '22',
                            'key_file': parts[3] if len(parts) > 3 else ''
                        }
                        hosts.append(host_config)
            return hosts
        except Exception as e:
            print(f"❌ Error cargando archivo de hosts: {e}")
            return []

    def deploy_to_host(self, host_config, dry_run=False):
        """Desplegar agente en un host específico"""
        host = host_config['host']
        user = host_config['user']
        port = host_config['port']
        key_file = host_config['key_file']
        
        print(f"🚀 Desplegando en {host} (usuario: {user})")
        
        # Construir comando
        cmd = [self.deploy_script]
        cmd.extend(['-u', user])
        cmd.extend(['-p', port])
        
        if key_file:
            cmd.extend(['-k', key_file])
        
        if dry_run:
            cmd.append('--dry-run')
        
        cmd.append(host)
        
        try:
            # Ejecutar despliegue
            start_time = time.time()
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutos timeout
            )
            
            duration = time.time() - start_time
            
            # Guardar resultado
            with self.lock:
                self.results[host] = {
                    'success': result.returncode == 0,
                    'duration': round(duration, 2),
                    'stdout': result.stdout,
                    'stderr': result.stderr,
                    'config': host_config
                }
            
            if result.returncode == 0:
                print(f"✅ {host} - Despliegue exitoso ({duration:.1f}s)")
            else:
                print(f"❌ {host} - Despliegue fallido ({duration:.1f}s)")
                print(f"   Error: {result.stderr.split('\\n')[0]}")
            
            return result.returncode == 0
            
        except subprocess.TimeoutExpired:
            with self.lock:
                self.results[host] = {
                    'success': False,
                    'duration': 300,
                    'stdout': '',
                    'stderr': 'Timeout después de 5 minutos',
                    'config': host_config
                }
            print(f"⏱️  {host} - Timeout")
            return False
            
        except Exception as e:
            with self.lock:
                self.results[host] = {
                    'success': False,
                    'duration': 0,
                    'stdout': '',
                    'stderr': str(e),
                    'config': host_config
                }
            print(f"❌ {host} - Error: {e}")
            return False

    def deploy_parallel(self, hosts, max_workers=5, dry_run=False):
        """Desplegar en paralelo a múltiples hosts"""
        print(f"🔄 Desplegando a {len(hosts)} hosts (max {max_workers} paralelos)")
        
        start_time = time.time()
        successful = 0
        failed = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Enviar trabajos
            future_to_host = {
                executor.submit(self.deploy_to_host, host_config, dry_run): host_config['host']
                for host_config in hosts
            }
            
            # Recoger resultados
            for future in as_completed(future_to_host):
                host = future_to_host[future]
                try:
                    success = future.result()
                    if success:
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    print(f"❌ Error procesando {host}: {e}")
                    failed += 1
        
        total_time = time.time() - start_time
        
        print(f"\\n📊 Resumen del despliegue:")
        print(f"   ✅ Exitosos: {successful}")
        print(f"   ❌ Fallidos: {failed}")
        print(f"   ⏱️  Tiempo total: {total_time:.1f}s")
        
        return successful, failed

    def generate_report(self, output_file=None):
        """Generar reporte de despliegue"""
        if not self.results:
            print("❌ No hay resultados para reportar")
            return
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_hosts': len(self.results),
            'successful': sum(1 for r in self.results.values() if r['success']),
            'failed': sum(1 for r in self.results.values() if not r['success']),
            'results': self.results
        }
        
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    json.dump(report, f, indent=2)
                print(f"📄 Reporte guardado: {output_file}")
            except Exception as e:
                print(f"❌ Error guardando reporte: {e}")
        
        # Mostrar resumen en consola
        print("\\n📋 Reporte detallado:")
        print("=" * 50)
        
        for host, result in self.results.items():
            status = "✅ ÉXITO" if result['success'] else "❌ FALLO"
            print(f"{status} {host:<20} ({result['duration']}s)")
            
            # Mostrar errores
            if not result['success'] and result['stderr']:
                error_lines = result['stderr'].split('\\n')[:2]  # Primeras 2 líneas
                for line in error_lines:
                    if line.strip():
                        print(f"   Error: {line.strip()}")
        
        return report

    def create_sample_hosts_file(self):
        """Crear archivo de ejemplo de hosts"""
        sample_content = """# ZienShield Hosts Configuration
# Formato: host:user:port:key_file
# Líneas que empiecen con # son comentarios

# Ejemplos:
# 192.168.1.100:root:22:/root/.ssh/id_rsa
# 192.168.1.101:admin:2222
# server.example.com:ubuntu:22:/home/user/.ssh/deploy_key

# Hosts de producción
# 10.0.1.10:root:22
# 10.0.1.11:root:22
# 10.0.1.12:root:22

# Hosts de desarrollo
# dev1.company.com:deploy:22:/keys/dev_key
# dev2.company.com:deploy:22:/keys/dev_key
"""
        
        sample_file = os.path.join(self.script_dir, 'hosts.example')
        try:
            with open(sample_file, 'w') as f:
                f.write(sample_content)
            print(f"📝 Archivo de ejemplo creado: {sample_file}")
        except Exception as e:
            print(f"❌ Error creando archivo de ejemplo: {e}")

def show_help():
    print("""
ZienShield Quick Deploy Tool

Uso: python3 quick-deploy.py [OPCIONES] [ARCHIVO_HOSTS]

Opciones:
  -w, --workers N       Número máximo de despliegues paralelos (default: 5)
  -r, --report FILE     Guardar reporte JSON en archivo
  --dry-run             Modo simulación
  --create-example      Crear archivo hosts.example
  -h, --help            Mostrar ayuda

Argumentos:
  ARCHIVO_HOSTS         Archivo con lista de hosts (default: hosts.txt)

Formato del archivo de hosts:
  Una línea por host con formato: host:user:port:key_file
  - host: IP o hostname (requerido)
  - user: usuario SSH (default: root)
  - port: puerto SSH (default: 22)
  - key_file: archivo de clave SSH (opcional)

Ejemplos:
  python3 quick-deploy.py hosts.txt
  python3 quick-deploy.py -w 10 -r report.json production_hosts.txt
  python3 quick-deploy.py --dry-run test_hosts.txt
  python3 quick-deploy.py --create-example

El script:
  1. Lee la lista de hosts del archivo
  2. Despliega agentes en paralelo
  3. Genera reporte de resultados
  4. Muestra resumen en consola
""")

def main():
    # Parsear argumentos
    import argparse
    
    parser = argparse.ArgumentParser(description='ZienShield Quick Deploy Tool', add_help=False)
    parser.add_argument('hosts_file', nargs='?', default='hosts.txt', help='Archivo de hosts')
    parser.add_argument('-w', '--workers', type=int, default=5, help='Número de workers paralelos')
    parser.add_argument('-r', '--report', help='Archivo de reporte JSON')
    parser.add_argument('--dry-run', action='store_true', help='Modo simulación')
    parser.add_argument('--create-example', action='store_true', help='Crear archivo de ejemplo')
    parser.add_argument('-h', '--help', action='store_true', help='Mostrar ayuda')
    
    args = parser.parse_args()
    
    if args.help:
        show_help()
        return
    
    deployer = ZienShieldQuickDeploy()
    
    if args.create_example:
        deployer.create_sample_hosts_file()
        return
    
    # Verificar que existe el script de despliegue
    if not os.path.exists(deployer.deploy_script):
        print(f"❌ Script de despliegue no encontrado: {deployer.deploy_script}")
        return
    
    # Cargar hosts
    if not os.path.exists(args.hosts_file):
        print(f"❌ Archivo de hosts no encontrado: {args.hosts_file}")
        print("   Crear archivo con: --create-example")
        return
    
    hosts = deployer.load_hosts_file(args.hosts_file)
    if not hosts:
        print("❌ No se encontraron hosts válidos en el archivo")
        return
    
    print(f"🎯 Desplegando agentes ZienShield")
    print(f"   Hosts: {len(hosts)}")
    print(f"   Workers: {args.workers}")
    print(f"   Archivo: {args.hosts_file}")
    
    if args.dry_run:
        print("   Modo: SIMULACIÓN")
    
    print("")
    
    # Ejecutar despliegue
    successful, failed = deployer.deploy_parallel(
        hosts, 
        max_workers=args.workers,
        dry_run=args.dry_run
    )
    
    # Generar reporte
    report = deployer.generate_report(args.report)
    
    # Exit code basado en resultados
    if failed == 0:
        print("\\n🎉 Todos los despliegues exitosos!")
        sys.exit(0)
    elif successful > 0:
        print(f"\\n⚠️  Despliegue parcial: {successful} exitosos, {failed} fallidos")
        sys.exit(1)
    else:
        print("\\n💥 Todos los despliegues fallaron")
        sys.exit(2)

if __name__ == "__main__":
    main()