const fs = require('fs');
const lucide = require('lucide-react');
const iconsFile = fs.readFileSync('src/lib/icons.ts', 'utf8');

const match = iconsFile.match(/export\s+\{([^}]+)\}/);
if (match) {
    const exportsStr = match[1];
    const items = exportsStr.split(',').map(s => s.trim().split('\n')[0].trim()).filter(s => s && !s.startsWith('//'));
    const missing = [];
    for (const item of items) {
        if (!lucide[item]) {
            missing.push(item);
        }
    }
    console.log('Missing icons:');
    console.log(missing.join('\n'));
}
