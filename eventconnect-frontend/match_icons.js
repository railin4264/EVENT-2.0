const lucide = require('lucide-react');
const exportsList = Object.keys(lucide);
const missing = [
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
const replacements = {};
for (const m of missing) {
    const lower = m.toLowerCase();
    let found = exportsList.find(e => e.toLowerCase() === lower);
    if (!found) found = exportsList.find(e => e.toLowerCase() === lower + 'icon');
    if (!found) found = exportsList.find(e => e.toLowerCase() === m.toLowerCase().replace(/[0-9]/g, ''));
    if (!found) found = exportsList.find(e => e.toLowerCase().includes(lower.substring(0, 4)));
    replacements[m] = found || 'NOT FOUND';
}
console.log(replacements);
