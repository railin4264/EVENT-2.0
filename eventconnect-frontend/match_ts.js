const fs = require('fs');
const content = fs.readFileSync('node_modules/lucide-react/dist/lucide-react.d.ts', 'utf8');

const exportBlockMatch = content.match(/export\s+\{([^}]+)\}/);
if (exportBlockMatch) {
    const exports = exportBlockMatch[1].split(',').map(s => s.trim().split(' as ')[1] || s.trim().split(' as ')[0]);
    const cleanExports = exports.map(s => s.trim()).filter(Boolean);

    const ts_output = fs.readFileSync('tsc_output.txt', 'utf16le');
    const matches = [...ts_output.matchAll(/has no exported member '([^']+)'/g)];
    const missingInTs = [...new Set(matches.map(m => m[1]))];

    const replacements = {};
    for (const m of missingInTs) {
        const lower = m.toLowerCase();
        let found = cleanExports.find(e => e.toLowerCase() === lower);
        if (!found) found = cleanExports.find(e => e.toLowerCase() === lower + 'icon');
        if (!found) found = cleanExports.find(e => e.toLowerCase() === m.toLowerCase().replace(/[0-9]/g, ''));
        if (!found) found = cleanExports.find(e => e.toLowerCase().includes(lower.substring(0, 4)));
        replacements[m] = found || 'NOT FOUND';
    }

    console.log(replacements);
}
