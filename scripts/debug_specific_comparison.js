function compareVersions(version1, version2) {
  console.log(`Comparing "${version1}" vs "${version2}"`);
  
  const v1parts = version1.split('.').map(n => parseInt(n) || 0);
  const v2parts = version2.split('.').map(n => parseInt(n) || 0);
  
  console.log(`v1parts: [${v1parts.join(', ')}]`);
  console.log(`v2parts: [${v2parts.join(', ')}]`);
  
  const maxLength = Math.max(v1parts.length, v2parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1 = v1parts[i] || 0;
    const v2 = v2parts[i] || 0;
    
    console.log(`Comparing part ${i}: ${v1} vs ${v2}`);
    
    if (v1 < v2) {
      console.log(`${v1} < ${v2}, returning -1`);
      return -1;
    }
    if (v1 > v2) {
      console.log(`${v1} > ${v2}, returning 1`);
      return 1;
    }
  }
  
  console.log('All parts equal, returning 0');
  return 0;
}

// Test the problematic cases
console.log('=== Test Adobe Acrobat ===');
const result1 = compareVersions('25.001.20577', '2020.0.0');
console.log(`Result: ${result1} (should be 1 since 25 > 2020)\n`);

console.log('=== Test Visual C++ ===');
const result2 = compareVersions('14.44.35112', '2015.0.0');
console.log(`Result: ${result2} (should be 1 since 14 > 2015... wait, that's wrong!)\n`);

console.log('=== Test correct Visual C++ comparison ===');
const result3 = compareVersions('14.44.35112', '14.0.0');
console.log(`Result: ${result3} (should be 1 since 14.44 > 14.0)\n`);