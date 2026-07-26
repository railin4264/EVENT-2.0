const fs = require('fs');
const path = require('path');

// Simple SVG to generate basic icons
const createIconSVG = (size, backgroundColor = '#6366f1', text = 'EC') => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" text-anchor="middle" dy="0.35em" fill="white">${text}</text>
</svg>`;
};

// Create splash screen SVG
const createSplashSVG = () => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="2560" viewBox="0 0 1200 2560" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="2560" fill="url(#splashGrad)"/>
  <circle cx="600" cy="1100" r="120" fill="white" opacity="0.9"/>
  <text x="600" y="1120" font-family="Arial, sans-serif" font-size="80" font-weight="bold" text-anchor="middle" fill="#6366f1">EC</text>
  <text x="600" y="1350" font-family="Arial, sans-serif" font-size="48" font-weight="600" text-anchor="middle" fill="white">EventConnect</text>
  <text x="600" y="1420" font-family="Arial, sans-serif" font-size="28" text-anchor="middle" fill="white" opacity="0.8">Discover • Connect • Experience</text>
</svg>`;
};

// Create adaptive icon background
const createAdaptiveBackgroundSVG = () => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="432" height="432" viewBox="0 0 432 432" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="adaptiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="432" height="432" fill="url(#adaptiveGrad)"/>
</svg>`;
};

// Create adaptive icon foreground
const createAdaptiveForegroundSVG = () => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="432" height="432" viewBox="0 0 432 432" xmlns="http://www.w3.org/2000/svg">
  <circle cx="216" cy="216" r="120" fill="white" opacity="0.95"/>
  <text x="216" y="240" font-family="Arial, sans-serif" font-size="100" font-weight="bold" text-anchor="middle" fill="#6366f1">EC</text>
</svg>`;
};

// Function to convert SVG to simple placeholder (we'll create SVG files for now)
const generateIcons = async () => {
  const assetsDir = path.join(__dirname, '../assets');

  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('🎨 Generating app icons...');

  // Main app icon (1024x1024)
  fs.writeFileSync(
    path.join(assetsDir, 'icon.svg'),
    createIconSVG(1024)
  );

  // Splash screen
  fs.writeFileSync(
    path.join(assetsDir, 'splash.svg'),
    createSplashSVG()
  );

  // Adaptive icon parts
  fs.writeFileSync(
    path.join(assetsDir, 'adaptive-icon-background.svg'),
    createAdaptiveBackgroundSVG()
  );

  fs.writeFileSync(
    path.join(assetsDir, 'adaptive-icon-foreground.svg'),
    createAdaptiveForegroundSVG()
  );

  // Favicon
  fs.writeFileSync(
    path.join(assetsDir, 'favicon.svg'),
    createIconSVG(32)
  );

  console.log('✅ Icons generated successfully!');
  console.log('📝 Note: SVG files created. For production, convert to PNG using:');
  console.log('   - icon.svg → icon.png (1024x1024)');
  console.log('   - splash.svg → splash.png (1200x2560)');
  console.log('   - adaptive-icon-*.svg → adaptive-icon.png (432x432)');
};

if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons };