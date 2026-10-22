import fs from 'node:fs';
const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const problems = [];
function secureOrigin(name, protocols) {
  try {
    const url = new URL(process.env[name] || '');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const local = host === 'localhost' || host === '::1' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || /\.(local|test|invalid|example)$/.test(host);
    if (!protocols.includes(url.protocol) || local || url.username || url.password) throw new Error();
  } catch { problems.push(`${name}: requiere una URL pública segura configurada explícitamente.`); }
}
secureOrigin('EXPO_PUBLIC_API_URL', ['https:']);
secureOrigin('EXPO_PUBLIC_WS_URL', ['https:', 'wss:']);
secureOrigin('EXPO_PUBLIC_WEB_URL', ['https:']);
const project = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || app.extra?.eas?.projectId || '';
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(project)) problems.push('EAS: falta un projectId válido del proyecto real.');
const maps = process.env.ANDROID_GOOGLE_MAPS_API_KEY || app.android?.config?.googleMaps?.apiKey || '';
if (!maps || /YOUR_|PLACEHOLDER/i.test(maps)) problems.push('Android Maps: falta configurar la clave del proyecto real.');
if (!app.android?.package || !app.ios?.bundleIdentifier) problems.push('Falta el identificador nativo de una plataforma.');
console.log(JSON.stringify({ readyForBuildConfiguration: problems.length === 0, checks: 6, problems, scope: 'Configuración estática; no certifica servicios, permisos, tiendas, firma, push ni pruebas físicas.' }, null, 2));
process.exitCode = problems.length ? 1 : 0;
