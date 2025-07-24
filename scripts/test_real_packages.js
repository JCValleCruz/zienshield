const { scanPackageForVulnerabilities } = require('../super-admin/backend/src/utils/vulnerabilityScanner');

// Real package names from the Wazuh agents
const realPackages = [
  { name: 'TeamViewer 12', version: '12.0.259192' },
  { name: 'Adobe Acrobat (64-bit)', version: '25.001.20577' },
  { name: 'Mozilla Maintenance Service', version: '131.0' },
  { name: 'Microsoft Visual C++ 2022 X64 Additional Runtime - 14.44.35112', version: '14.44.35112' },
  { name: 'Microsoft Visual C++ 2015 Redistributable (x86) - 14.0.23506', version: '14.0.23506.0' },
  { name: 'Realtek Audio Console', version: '1.40.287.0' },
  { name: 'Game Bar', version: '7.325.5191.0' },
  { name: 'Xbox', version: '2507.1001.9.0' },
  { name: 'Xbox Identity Provider', version: '12.115.1001.0' }
];

console.log('🧪 Probando detección con nombres de paquetes reales...\n');

for (const pkg of realPackages) {
  console.log(`📦 Analizando: "${pkg.name}" v${pkg.version}`);
  const vulnerabilities = scanPackageForVulnerabilities(pkg.name, pkg.version);
  
  if (vulnerabilities.length > 0) {
    console.log(`   ⚠️ ${vulnerabilities.length} vulnerabilidades encontradas:`);
    vulnerabilities.forEach(vuln => {
      console.log(`      - ${vuln.cve} (${vuln.severity.toUpperCase()}) CVSS: ${vuln.cvss_score}`);
    });
  } else {
    console.log('   ❌ No se encontraron vulnerabilidades');
    // Debug: show normalized name
    const normalizedName = pkg.name.toLowerCase()
      .replace(/-dev$|^lib/, '')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(`      Nombre normalizado: "${normalizedName}"`);
  }
  console.log('');
}