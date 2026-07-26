/**
 * Script de Verificación de Funcionalidades
 * EVENT NOW 2.0
 * 
 * Verifica el estado de implementación de todas las funcionalidades
 */

const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Funcionalidades a verificar
const features = {
  'BACKEND': {
    'Autenticación': [
      { name: 'Login/Logout', file: 'backend-api/src/routes/auth.js', pattern: /router\.(post|get)\(['"]\/login/ },
      { name: 'Registro', file: 'backend-api/src/routes/auth.js', pattern: /router\.post\(['"]\/register/ },
      { name: 'Refresh Token', file: 'backend-api/src/services/authService.js', pattern: /refreshAccessToken/ },
      { name: 'Password Recovery', file: 'backend-api/src/routes/auth.js', pattern: /forgot-password/ },
      { name: '2FA/MFA', file: 'backend-api/src/routes/auth.js', pattern: /enable-2fa|verify-2fa/ },
      { name: 'OAuth Social', file: 'backend-api/src/routes/auth.js', pattern: /google|facebook|github/ }
    ],
    'Eventos': [
      { name: 'CRUD Eventos', file: 'backend-api/src/routes/events.js', pattern: /router\.(get|post|put|delete)/ },
      { name: 'Eventos Cercanos', file: 'backend-api/src/routes/events.js', pattern: /nearby|geolocation/ },
      { name: 'Categorías', file: 'backend-api/src/models/Event.js', pattern: /category|categories/ },
      { name: 'Búsqueda Avanzada', file: 'backend-api/src/routes/search.js', pattern: /search|filter/ },
      { name: 'Favoritos', file: 'backend-api/src/routes/events.js', pattern: /favorite|bookmark/ }
    ],
    'Pagos': [
      { name: 'Stripe Integration', file: 'backend-api/src/config/stripe.js', pattern: /stripe|Stripe/ },
      { name: 'Crear Orden', file: 'backend-api/src/services/paymentService.js', pattern: /createOrder/ },
      { name: 'Procesar Pago', file: 'backend-api/src/services/paymentService.js', pattern: /createPaymentIntent/ },
      { name: 'Tickets/QR', file: 'backend-api/src/models/Ticket.js', pattern: /Ticket|qrCode/ },
      { name: 'Refunds', file: 'backend-api/src/services/paymentService.js', pattern: /processRefund/ }
    ],
    'Social': [
      { name: 'Feed', file: 'backend-api/src/routes/feed.js', pattern: /feed|timeline/ },
      { name: 'Chat/Mensajes', file: 'backend-api/src/services/chatService.js', pattern: /sendMessage|chat/ },
      { name: 'Comentarios', file: 'backend-api/src/routes/comments.js', pattern: /comment/ },
      { name: 'Stories', file: 'backend-api/src/routes/stories.js', pattern: /story|stories/ },
      { name: 'Follows/Amigos', file: 'backend-api/src/routes/follows.js', pattern: /follow|unfollow/ }
    ],
    'Gamificación': [
      { name: 'Sistema de Puntos', file: 'backend-api/src/models/User.js', pattern: /points|score/ },
      { name: 'Achievements', file: 'backend-api/src/routes/gamification.js', pattern: /achievement|badge/ },
      { name: 'Leaderboards', file: 'backend-api/src/routes/gamification.js', pattern: /leaderboard|ranking/ },
      { name: 'Challenges', file: 'backend-api/src/routes/gamification.js', pattern: /challenge/ },
      { name: 'Rewards', file: 'backend-api/src/models/Reward.js', pattern: /reward|prize/ }
    ],
    'Notificaciones': [
      { name: 'In-App', file: 'backend-api/src/routes/notifications.js', pattern: /notification/ },
      { name: 'Push (Firebase)', file: 'backend-api/src/config/firebase.js', pattern: /firebase|FCM/ },
      { name: 'Email', file: 'backend-api/src/services/emailService.js', pattern: /sendEmail|nodemailer/ },
      { name: 'SMS', file: 'backend-api/src/services/smsService.js', pattern: /twilio|sms/ },
      { name: 'WebSockets', file: 'backend-api/src/services/socketService.js', pattern: /socket\.io|websocket/ }
    ],
    'Analytics': [
      { name: 'Dashboard', file: 'backend-api/src/routes/dashboard.js', pattern: /dashboard|statistics/ },
      { name: 'Reportes', file: 'backend-api/src/routes/analytics.js', pattern: /report|analytics/ },
      { name: 'Métricas', file: 'backend-api/src/services/analyticsService.js', pattern: /metrics|tracking/ },
      { name: 'Logs', file: 'backend-api/src/utils/logger.js', pattern: /winston|logger/ }
    ]
  },
  'FRONTEND': {
    'UI Components': [
      { name: 'Login Form', file: 'eventconnect-frontend/src/components/auth/LoginForm.tsx', pattern: /LoginForm|login/ },
      { name: 'Register Form', file: 'eventconnect-frontend/src/components/auth/RegisterForm.tsx', pattern: /RegisterForm|register/ },
      { name: 'Event Cards', file: 'eventconnect-frontend/src/components/events/EventCard.tsx', pattern: /EventCard/ },
      { name: 'Navigation', file: 'eventconnect-frontend/src/components/layout/Navigation.tsx', pattern: /Navigation|Navbar/ },
      { name: 'Map Component', file: 'eventconnect-frontend/src/components/map/MapView.tsx', pattern: /Map|Leaflet/ }
    ],
    'Pages': [
      { name: 'Home Page', file: 'eventconnect-frontend/src/app/page.tsx', pattern: /Home|Landing/ },
      { name: 'Events Page', file: 'eventconnect-frontend/src/app/events/page.tsx', pattern: /Events|EventList/ },
      { name: 'Profile Page', file: 'eventconnect-frontend/src/app/profile/page.tsx', pattern: /Profile/ },
      { name: 'Dashboard', file: 'eventconnect-frontend/src/app/dashboard/page.tsx', pattern: /Dashboard/ },
      { name: 'Chat Page', file: 'eventconnect-frontend/src/app/chat/page.tsx', pattern: /Chat|Messages/ }
    ],
    'Services': [
      { name: 'Auth Service', file: 'eventconnect-frontend/src/services/authService.ts', pattern: /login|logout|register/ },
      { name: 'API Service', file: 'eventconnect-frontend/src/services/apiService.ts', pattern: /axios|fetch/ },
      { name: 'Socket Service', file: 'eventconnect-frontend/src/services/socketService.ts', pattern: /socket\.io/ },
      { name: 'Storage Service', file: 'eventconnect-frontend/src/services/storageService.ts', pattern: /localStorage|sessionStorage/ }
    ],
    'State Management': [
      { name: 'Auth Store', file: 'eventconnect-frontend/src/stores/authStore.ts', pattern: /useAuthStore|zustand/ },
      { name: 'Event Store', file: 'eventconnect-frontend/src/stores/eventStore.ts', pattern: /useEventStore/ },
      { name: 'UI Store', file: 'eventconnect-frontend/src/stores/uiStore.ts', pattern: /useUIStore/ }
    ]
  },
  'MOBILE': [
    { name: 'App Entry', file: 'mobile-app/App.tsx', pattern: /App|export default/ },
    { name: 'Navigation', file: 'mobile-app/src/navigation/AppNavigator.tsx', pattern: /Navigator|Navigation/ },
    { name: 'Screens', file: 'mobile-app/src/screens', pattern: /Screen/ },
    { name: 'Components', file: 'mobile-app/src/components', pattern: /component/ },
    { name: 'Expo Config', file: 'mobile-app/app.json', pattern: /expo/ }
  ],
  'INFRASTRUCTURE': {
    'Docker': [
      { name: 'Docker Compose', file: 'docker-compose.yml', pattern: /version|services/ },
      { name: 'Dockerfile Backend', file: 'backend-api/Dockerfile', pattern: /FROM|WORKDIR/ },
      { name: 'Dockerfile Frontend', file: 'eventconnect-frontend/Dockerfile', pattern: /FROM|WORKDIR/ },
      { name: 'Nginx Config', file: 'nginx/nginx.conf', pattern: /server|location/ }
    ],
    'CI/CD': [
      { name: 'GitHub Actions', file: '.github/workflows/ci.yml', pattern: /workflow|jobs/ },
      { name: 'Test Scripts', file: 'package.json', pattern: /test|jest/ },
      { name: 'Build Scripts', file: 'package.json', pattern: /build/ }
    ],
    'Monitoring': [
      { name: 'Health Checks', file: 'backend-api/src/routes/health.js', pattern: /health|status/ },
      { name: 'Prometheus', file: 'monitoring/prometheus.yml', pattern: /prometheus/ },
      { name: 'Grafana', file: 'monitoring/grafana', pattern: /dashboard/ }
    ]
  }
};

// Función para verificar si un archivo existe y contiene un patrón
function checkFeature(feature) {
  const filePath = path.join(__dirname, '..', feature.file);
  
  // Verificar si es un directorio
  if (feature.file.endsWith('/') || !feature.file.includes('.')) {
    try {
      const stats = fs.statSync(filePath);
      return { exists: stats.isDirectory(), implemented: stats.isDirectory() };
    } catch {
      return { exists: false, implemented: false };
    }
  }
  
  // Verificar archivo
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const implemented = feature.pattern ? feature.pattern.test(content) : true;
      return { exists: true, implemented };
    }
    return { exists: false, implemented: false };
  } catch (error) {
    return { exists: false, implemented: false, error: error.message };
  }
}

// Función para imprimir el estado con colores
function printStatus(name, status) {
  let icon, color;
  
  if (status.implemented) {
    icon = '✅';
    color = colors.green;
  } else if (status.exists) {
    icon = '⚠️ ';
    color = colors.yellow;
  } else {
    icon = '❌';
    color = colors.red;
  }
  
  console.log(`    ${icon} ${color}${name}${colors.reset}`);
  
  return status.implemented ? 1 : 0;
}

// Ejecutar verificación
console.log('\n' + colors.cyan + colors.bright + '════════════════════════════════════════════════════════' + colors.reset);
console.log(colors.cyan + colors.bright + '     EVENT NOW 2.0 - VERIFICACIÓN DE FUNCIONALIDADES' + colors.reset);
console.log(colors.cyan + colors.bright + '════════════════════════════════════════════════════════' + colors.reset + '\n');

let totalFeatures = 0;
let implementedFeatures = 0;
const summary = {};

// Verificar cada categoría
for (const [category, items] of Object.entries(features)) {
  console.log(colors.blue + colors.bright + `\n📦 ${category}` + colors.reset);
  console.log('─'.repeat(50));
  
  summary[category] = { total: 0, implemented: 0 };
  
  if (Array.isArray(items)) {
    // Items simples
    for (const feature of items) {
      const status = checkFeature(feature);
      implementedFeatures += printStatus(feature.name, status);
      totalFeatures++;
      summary[category].total++;
      if (status.implemented) summary[category].implemented++;
    }
  } else {
    // Items con subcategorías
    for (const [subCategory, subItems] of Object.entries(items)) {
      console.log(colors.magenta + `\n  ${subCategory}:` + colors.reset);
      
      for (const feature of subItems) {
        const status = checkFeature(feature);
        implementedFeatures += printStatus(feature.name, status);
        totalFeatures++;
        summary[category].total++;
        if (status.implemented) summary[category].implemented++;
      }
    }
  }
}

// Resumen final
console.log('\n' + colors.cyan + '════════════════════════════════════════════════════════' + colors.reset);
console.log(colors.cyan + colors.bright + '                    RESUMEN FINAL' + colors.reset);
console.log(colors.cyan + '════════════════════════════════════════════════════════' + colors.reset + '\n');

for (const [category, stats] of Object.entries(summary)) {
  const percentage = ((stats.implemented / stats.total) * 100).toFixed(1);
  const color = percentage >= 70 ? colors.green : percentage >= 40 ? colors.yellow : colors.red;
  
  console.log(`${color}${category}: ${stats.implemented}/${stats.total} (${percentage}%)${colors.reset}`);
  
  // Barra de progreso
  const barLength = 30;
  const filled = Math.round((stats.implemented / stats.total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log(`  [${color}${bar}${colors.reset}]\n`);
}

// Porcentaje total
const totalPercentage = ((implementedFeatures / totalFeatures) * 100).toFixed(1);
const totalColor = totalPercentage >= 70 ? colors.green : totalPercentage >= 40 ? colors.yellow : colors.red;

console.log('─'.repeat(50));
console.log(colors.bright + '\n📊 ESTADO GLOBAL:' + colors.reset);
console.log(`${totalColor}${colors.bright}   ${implementedFeatures}/${totalFeatures} funcionalidades implementadas (${totalPercentage}%)${colors.reset}\n`);

// Barra de progreso total
const totalBarLength = 50;
const totalFilled = Math.round((implementedFeatures / totalFeatures) * totalBarLength);
const totalBar = '█'.repeat(totalFilled) + '░'.repeat(totalBarLength - totalFilled);
console.log(`   [${totalColor}${totalBar}${colors.reset}]\n`);

// Recomendaciones basadas en el estado
console.log(colors.cyan + '📝 RECOMENDACIONES:' + colors.reset);
if (totalPercentage < 40) {
  console.log(colors.red + '   ⚠️  La aplicación requiere trabajo significativo antes de producción' + colors.reset);
  console.log('   • Enfócate en funcionalidades core primero');
  console.log('   • Implementa autenticación completa');
  console.log('   • Asegura CRUD básico de eventos');
} else if (totalPercentage < 70) {
  console.log(colors.yellow + '   ⚠️  La aplicación está parcialmente funcional' + colors.reset);
  console.log('   • Completa las funcionalidades faltantes críticas');
  console.log('   • Implementa sistema de pagos');
  console.log('   • Mejora la experiencia móvil');
} else {
  console.log(colors.green + '   ✅ La aplicación está lista para testing beta' + colors.reset);
  console.log('   • Realiza pruebas exhaustivas');
  console.log('   • Optimiza performance');
  console.log('   • Prepara documentación');
}

console.log('\n' + colors.cyan + '════════════════════════════════════════════════════════' + colors.reset + '\n');

// Generar reporte en archivo
const report = {
  timestamp: new Date().toISOString(),
  version: '2.0.0',
  summary: {
    total: totalFeatures,
    implemented: implementedFeatures,
    percentage: totalPercentage
  },
  categories: summary,
  recommendations: totalPercentage < 40 ? 'critical' : totalPercentage < 70 ? 'moderate' : 'ready'
};

fs.writeFileSync(
  path.join(__dirname, 'feature-verification-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Reporte guardado en: fixes/feature-verification-report.json\n');
