/**
 * Script para generar íconos PWA
 * Ejecutar: node scripts/generate-pwa-icons.js
 *
 * Requiere: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG base del ícono de EventConnect
const SVG_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366F1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <g fill="white">
    <circle cx="256" cy="180" r="60"/>
    <path d="M160 340 Q256 280 352 340 Q352 420 256 420 Q160 420 160 340"/>
    <circle cx="380" cy="180" r="30" opacity="0.7"/>
    <circle cx="132" cy="180" r="30" opacity="0.7"/>
    <path d="M100 300 Q132 260 164 300" stroke="white" stroke-width="8" fill="none" opacity="0.5"/>
    <path d="M348 300 Q380 260 412 300" stroke="white" stroke-width="8" fill="none" opacity="0.5"/>
  </g>
  <text x="256" y="490" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">EC</text>
</svg>
`;

async function generateIcons() {
  // Crear directorio si no existe
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Guardar el SVG base
  const svgPath = path.join(ICONS_DIR, 'icon.svg');
  fs.writeFileSync(svgPath, SVG_ICON.trim());
  console.log('✅ Generado: icon.svg');

  // Generar PNGs en diferentes tamaños
  for (const size of SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(SVG_ICON))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✅ Generado: icon-${size}x${size}.png`);
  }

  // Generar favicon
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  await sharp(Buffer.from(SVG_ICON))
    .resize(32, 32)
    .toFile(faviconPath.replace('.ico', '.png'));
  console.log('✅ Generado: favicon.png (renombrar a .ico manualmente si es necesario)');

  // Generar apple-touch-icon
  const appleTouchPath = path.join(ICONS_DIR, 'apple-touch-icon.png');
  await sharp(Buffer.from(SVG_ICON))
    .resize(180, 180)
    .png()
    .toFile(appleTouchPath);
  console.log('✅ Generado: apple-touch-icon.png');

  console.log('\n🎉 ¡Todos los íconos generados exitosamente!');
  console.log('\nPróximos pasos:');
  console.log('1. Verifica los íconos en public/icons/');
  console.log('2. Si tienes un logo personalizado, reemplaza los PNGs generados');
  console.log('3. Prueba la PWA en Chrome DevTools > Application > Manifest');
}

generateIcons().catch(console.error);
