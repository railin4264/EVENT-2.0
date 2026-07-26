const fs = require('fs');
const path = require('path');

// Simple 1x1 PNG data (base64 encoded) - we'll create minimal PNGs
const createMinimalPNG = (width, height, color = '#6366f1') => {
  // This is a minimal PNG header + data for a solid color image
  // For now, we'll create a simple placeholder text file that can be renamed
  const pngContent = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;
  return Buffer.from(pngContent.split(',')[1], 'base64');
};

// Better approach: create SVG files and a simple HTML converter
const createHTMLConverter = () => {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Icon Converter</title>
    <style>
        canvas { border: 1px solid #ccc; margin: 10px; }
        .container { text-align: center; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>EventConnect Icon Converter</h1>
        <p>Converting SVG to PNG...</p>

        <!-- Icon Canvas -->
        <canvas id="iconCanvas" width="1024" height="1024"></canvas>

        <!-- Splash Canvas -->
        <canvas id="splashCanvas" width="1200" height="2560" style="width:120px;height:256px;"></canvas>

        <!-- Adaptive Icon Canvas -->
        <canvas id="adaptiveCanvas" width="432" height="432"></canvas>

        <div>
            <button onclick="downloadIcon()">Download Icon PNG</button>
            <button onclick="downloadSplash()">Download Splash PNG</button>
            <button onclick="downloadAdaptive()">Download Adaptive PNG</button>
        </div>
    </div>

    <script>
        // Icon Generator
        function drawIcon(canvas, size, text = 'EC') {
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#8b5cf6');

            // Background
            ctx.fillStyle = gradient;
            ctx.roundRect(0, 0, size, size, size * 0.1);
            ctx.fill();

            // Text
            ctx.fillStyle = 'white';
            ctx.font = \`bold \${size * 0.4}px Arial\`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, size/2, size/2);
        }

        function drawSplash(canvas) {
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;

            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, w, h);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(0.5, '#8b5cf6');
            gradient.addColorStop(1, '#ec4899');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Logo circle
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(w/2, h*0.43, 120, 0, 2 * Math.PI);
            ctx.fill();

            // Logo text
            ctx.fillStyle = '#6366f1';
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('EC', w/2, h*0.43);

            // App name
            ctx.fillStyle = 'white';
            ctx.font = '600 48px Arial';
            ctx.fillText('EventConnect', w/2, h*0.52);

            // Tagline
            ctx.font = '28px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillText('Discover • Connect • Experience', w/2, h*0.55);
        }

        function downloadCanvas(canvas, filename) {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

        function downloadIcon() {
            downloadCanvas(document.getElementById('iconCanvas'), 'icon.png');
        }

        function downloadSplash() {
            downloadCanvas(document.getElementById('splashCanvas'), 'splash.png');
        }

        function downloadAdaptive() {
            downloadCanvas(document.getElementById('adaptiveCanvas'), 'adaptive-icon.png');
        }

        // Initialize
        window.onload = function() {
            drawIcon(document.getElementById('iconCanvas'), 1024);
            drawSplash(document.getElementById('splashCanvas'));
            drawIcon(document.getElementById('adaptiveCanvas'), 432);

            console.log('Icons ready for download!');
        };

        // CanvasRenderingContext2D.prototype.roundRect polyfill
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
                this.beginPath();
                this.moveTo(x + radius, y);
                this.lineTo(x + width - radius, y);
                this.quadraticCurveTo(x + width, y, x + width, y + radius);
                this.lineTo(x + width, y + height - radius);
                this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                this.lineTo(x + radius, y + height);
                this.quadraticCurveTo(x, y + height, x, y + height - radius);
                this.lineTo(x, y + radius);
                this.quadraticCurveTo(x, y, x + radius, y);
                this.closePath();
            };
        }
    </script>
</body>
</html>`;
};

const generatePlaceholders = () => {
  const assetsDir = path.join(__dirname, '../assets');

  // Create simple 1x1 PNG files as placeholders
  const simplePNG = createMinimalPNG();

  // Write placeholder PNG files
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), simplePNG);
  fs.writeFileSync(path.join(assetsDir, 'splash.png'), simplePNG);
  fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), simplePNG);
  fs.writeFileSync(path.join(assetsDir, 'favicon.png'), simplePNG);
  fs.writeFileSync(path.join(assetsDir, 'notification-icon.png'), simplePNG);

  // Create HTML converter for better icons
  fs.writeFileSync(
    path.join(assetsDir, 'icon-generator.html'),
    createHTMLConverter()
  );

  console.log('✅ PNG placeholders created!');
  console.log('🎨 Open assets/icon-generator.html in browser to generate proper icons');
  console.log('📁 Files created:');
  console.log('   - icon.png (placeholder)');
  console.log('   - splash.png (placeholder)');
  console.log('   - adaptive-icon.png (placeholder)');
  console.log('   - favicon.png (placeholder)');
  console.log('   - notification-icon.png (placeholder)');
  console.log('   - icon-generator.html (for proper icons)');
};

if (require.main === module) {
  generatePlaceholders();
}

module.exports = { generatePlaceholders };