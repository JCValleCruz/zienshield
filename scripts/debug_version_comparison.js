const { scanPackageForVulnerabilities } = require('../super-admin/backend/src/utils/vulnerabilityScanner');

// Debug version comparisons
function compareVersions(version1, version2) {
  const v1parts = version1.split('.').map(n => parseInt(n) || 0);
  const v2parts = version2.split('.').map(n => parseInt(n) || 0);
  
  const maxLength = Math.max(v1parts.length, v2parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1 = v1parts[i] || 0;
    const v2 = v2parts[i] || 0;
    
    if (v1 < v2) return -1;
    if (v1 > v2) return 1;
  }
  
  return 0;
}

function isVersionVulnerable(packageVersion, vulnVersionRange) {
  const [minVersion, maxVersion] = vulnVersionRange;
  
  let cleanVersion = packageVersion
    .replace(/[^\d.]/g, '')
    .split('-')[0]
    .split(' ')[0];
    
  if (!cleanVersion || cleanVersion === '') {
    cleanVersion = '0.0.0';
  }
  
  const versionParts = cleanVersion.split('.');
  if (versionParts.length > 4) {
    cleanVersion = versionParts.slice(0, 4).join('.');
  }
  
  console.log(`  Versión limpia: "${cleanVersion}"`);
  console.log(`  Rango vulnerable: ${minVersion} - ${maxVersion}`);
  console.log(`  Comparación con min: ${compareVersions(cleanVersion, minVersion)} (>=0 es vulnerable)`);
  console.log(`  Comparación con max: ${compareVersions(cleanVersion, maxVersion)} (<=0 es vulnerable)`);
  
  const isVuln = compareVersions(cleanVersion, minVersion) >= 0 && 
                compareVersions(cleanVersion, maxVersion) <= 0;
  
  console.log(`  Es vulnerable: ${isVuln}`);
  
  return isVuln;
}

// Test cases
const testCases = [
  { name: 'Adobe Acrobat (64-bit)', version: '25.001.20577' },
  { name: 'Mozilla Maintenance Service', version: '131.0' },
  { name: 'Microsoft Visual C++ 2022 X64 Additional Runtime - 14.44.35112', version: '14.44.35112' },
  { name: 'Microsoft Visual C++ 2015 Redistributable (x86) - 14.0.23506', version: '14.0.23506.0' },
  { name: 'Realtek Audio Console', version: '1.40.287.0' }
];

console.log('🐛 Debug de comparación de versiones...\n');

testCases.forEach(pkg => {
  console.log(`📦 Paquete: ${pkg.name} v${pkg.version}`);
  
  // Test Adobe Acrobat specifically
  if (pkg.name.includes('Adobe Acrobat')) {
    console.log('  🔍 Probando rango de Adobe Acrobat [2020.0.0, 2024.2.20933]:');
    isVersionVulnerable(pkg.version, ['2020.0.0', '2024.2.20933']);
    console.log('  🔍 Probando rango extendido [2020.0.0, 2025.12.99999]:');
    isVersionVulnerable(pkg.version, ['2020.0.0', '2025.12.99999']);
  }
  
  // Test Visual C++ specifically  
  if (pkg.name.includes('Visual C++')) {
    console.log('  🔍 Probando rango de Visual C++ [2015.0.0, 2022.17.8.5]:');
    isVersionVulnerable(pkg.version, ['2015.0.0', '2022.17.8.5']);
    console.log('  🔍 Probando rango extendido [2015.0.0, 2024.99.99.9]:');
    isVersionVulnerable(pkg.version, ['2015.0.0', '2024.99.99.9']);
  }
  
  console.log('');
});