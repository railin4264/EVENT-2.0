const fs = require('fs');
const path = require('path');
const lucide = require('lucide-react');

// The missing icons found by parse_tsc.js
const missingIcons = [
    'TicketCheck', 'Video', 'Mic', 'Music',
    'Trophy', 'Laptop', 'Palette', 'Utensils',
    'Book', 'Plane', 'Reply', 'Pencil',
    'Flag', 'DollarSign', 'Ticket', 'Flame',
    'PartyPopper', 'Sparkles', 'Link', 'Facebook',
    'ThumbsDown', 'Award', 'Target', 'Gift',
    'TicketIcon', 'Smartphone', 'Upload', 'ArrowLeft',
    'ArrowUp', 'ArrowDown', 'Minus', 'UserPlus',
    'UserCheck', 'Timer', 'Navigation', 'Compass',
    'Sliders', 'Folder', 'BellOff', 'CreditCard',
    'ShoppingCart', 'Tag', 'Music2', 'Gamepad2',
    'Medal', 'Dumbbell', 'Coffee', 'Wine',
    'Brush', 'BookOpen', 'GraduationCap', 'Briefcase',
    'Building2', 'Car', 'Train', 'Bike',
    'Cloud', 'CloudRain', 'ShieldCheck', 'Key',
    'TrendingDown', 'BarChart', 'PieChart', 'Activity',
    'QrCode', 'Youtube', 'Github', 'Forward',
    'CornerUpLeft', 'CornerUpRight', 'Maximize', 'Minimize',
    'Fullscreen', 'Grid', 'List', 'Layout',
    'Layers', 'Box', 'Package', 'Archive',
    'Inbox'
];

// Available icons in current lucide-react
const availableIcons = Object.keys(lucide);

const replacements = {};

missingIcons.forEach(icon => {
    if (availableIcons.includes(icon)) {
        console.log(`Icon ${icon} actually EXISTS!`);
    } else {
        // try to find alternative
        const lowerIcon = icon.toLowerCase();
        const alt = availableIcons.find(a => a.toLowerCase() === lowerIcon || a.toLowerCase() === lowerIcon.replace('icon', '')) || 'Circle';
        replacements[icon] = alt;
        console.log(`Replacing ${icon} -> ${alt}`);
    }
});

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

let changedFiles = 0;
walkDir(path.join(__dirname, 'src'), function (filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Replace in imports like: import { TicketCheck, Video } from 'lucide-react'
        const lucideImportRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/g;
        content = content.replace(lucideImportRegex, (match, p1) => {
            let imports = p1.split(',').map(s => s.trim());
            let newImports = imports.map(imp => {
                let [name, alias] = imp.split(/\s+as\s+/);
                name = name.trim();
                if (replacements[name]) {
                    return `${replacements[name]} as ${alias || name}`;
                }
                return imp;
            });
            // Deduplicate imports
            const uniqueImports = [];
            const seen = new Set();
            newImports.forEach(imp => {
                let [name, alias] = imp.split(/\s+as\s+/);
                const key = alias || name;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueImports.push(imp);
                }
            });
            return `import { ${uniqueImports.join(', ')} } from 'lucide-react'`;
        });

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            changedFiles++;
        }
    }
});

console.log(`Fixed imports in ${changedFiles} files.`);
