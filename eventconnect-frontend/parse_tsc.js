const fs = require('fs');
const content = fs.readFileSync('tsc_output.txt', 'utf16le');
const matches = [...content.matchAll(/has no exported member '([^']+)'/g)];
const unique = [...new Set(matches.map(m => m[1]))];
console.log('Missing exports from TS perspective:');
console.log(unique);
