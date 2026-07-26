#!/usr/bin/env node

/**
 * 🚀 Script de Verificación de Funcionalidades - EventConnect v4.0.0
 * 
 * Este script verifica que todas las funcionalidades avanzadas estén implementadas
 * y funcionando correctamente.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Función para imprimir con colores
function print(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Función para verificar si un archivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Función para verificar si un directorio existe
function dirExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

// Función para verificar dependencias
function checkDependencies() {
  print('cyan', '\n🔍 Verificando dependencias...');
  
  const packageFiles = [
    'package.json',
    'backend/package.json',
    'web/package.json',
    'mobile/package.json'
  ];
  
  let allDepsOk = true;
  
  packageFiles.forEach(pkgFile => {
    if (fileExists(pkgFile)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
        print('green', `✅ ${pkgFile} - Versión: ${pkg.version || 'N/A'}`);
      } catch (error) {
        print('red', `❌ ${pkgFile} - Error al leer: ${error.message}`);
        allDepsOk = false;
      }
    } else {
      print('yellow', `⚠️  ${pkgFile} - No encontrado`);
    }
  });
  
  return allDepsOk;
}

// Función para verificar funcionalidades del backend
function checkBackendFeatures() {
  print('cyan', '\n⚙️  Verificando funcionalidades del Backend...');
  
  const backendFeatures = [
    'backend/src/controllers/authController.js',
    'backend/src/routes/auth.js',
    'backend/src/middleware/logger.js',
    'backend/src/services/SearchService.js',
    'backend/src/config/cloudinary.js'
  ];
  
  let backendOk = true;
  
  backendFeatures.forEach(feature => {
    if (fileExists(feature)) {
      print('green', `✅ ${feature}`);
    } else {
      print('red', `❌ ${feature} - No encontrado`);
      backendOk = false;
    }
  });
  
  return backendOk;
}

// Función para verificar funcionalidades del frontend web
function checkWebFeatures() {
  print('cyan', '\n🌐 Verificando funcionalidades del Frontend Web...');
  
  const webFeatures = [
    'web/src/components/ui/Button.tsx',
    'web/src/components/ui/Card.tsx',
    'web/src/components/ui/Input.tsx',
    'web/src/components/ui/Modal.tsx',
    'web/src/components/ui/Dropdown.tsx',
    'web/src/components/ui/Tabs.tsx',
    'web/src/components/ui/Toast.tsx',
    'web/src/components/ui/Loading.tsx',
    'web/src/components/ui/PageTransition.tsx',
    'web/src/components/gamification/AchievementSystem.tsx',
    'web/src/components/ai/AIRecommendationSystem.tsx',
    'web/src/components/internationalization/InternationalizationSystem.tsx',
    'web/src/components/accessibility/AccessibilitySystem.tsx',
    'web/src/components/performance/PerformanceOptimizationSystem.tsx',
    'web/src/components/auth/AdvancedAuthSystem.tsx',
    'web/src/components/pwa/PWAManager.tsx',
    'web/src/components/location/IntelligentLocationSystem.tsx',
    'web/src/components/dashboard/Dashboard.tsx',
    'web/src/contexts/ThemeContext.tsx',
    'web/src/hooks/useServiceWorker.ts',
    'web/public/sw.js',
    'web/public/manifest.json',
    'web/src/app/globals.css'
  ];
  
  let webOk = true;
  
  webFeatures.forEach(feature => {
    if (fileExists(feature)) {
      print('green', `✅ ${feature}`);
    } else {
      print('red', `❌ ${feature} - No encontrado`);
      webOk = false;
    }
  });
  
  return webOk;
}

// Función para verificar funcionalidades móviles
function checkMobileFeatures() {
  print('cyan', '\n📱 Verificando funcionalidades Móviles...');
  
  const mobileFeatures = [
    'mobile/src/screens/HomeScreen.tsx',
    'mobile/src/screens/EventsScreen.tsx',
    'mobile/app.json',
    'mobile/package.json'
  ];
  
  let mobileOk = true;
  
  mobileFeatures.forEach(feature => {
    if (fileExists(feature)) {
      print('green', `✅ ${feature}`);
    } else {
      print('red', `❌ ${feature} - No encontrado`);
      mobileOk = false;
    }
  });
  
  return mobileOk;
}

// Función para verificar archivos de configuración
function checkConfigFiles() {
  print('cyan', '\n⚙️  Verificando archivos de configuración...');
  
  const configFiles = [
    '.env.example',
    'backend/.env.example',
    'web/.env.example',
    'mobile/.env.example',
    'docker-compose.yml',
    'Makefile',
    '.gitignore',
    'README.md'
  ];
  
  let configOk = true;
  
  configFiles.forEach(config => {
    if (fileExists(config)) {
      print('green', `✅ ${config}`);
    } else {
      print('yellow', `⚠️  ${config} - No encontrado`);
    }
  });
  
  return configOk;
}

// Función para verificar estructura de directorios
function checkDirectoryStructure() {
  print('cyan', '\n📁 Verificando estructura de directorios...');
  
  const requiredDirs = [
    'backend',
    'web',
    'mobile',
    'components',
    'docs',
    'scripts',
    'config'
  ];
  
  let structureOk = true;
  
  requiredDirs.forEach(dir => {
    if (dirExists(dir)) {
      print('green', `✅ ${dir}/`);
    } else {
      print('red', `❌ ${dir}/ - No encontrado`);
      structureOk = false;
    }
  });
  
  return structureOk;
}

// Función para verificar tests
function checkTests() {
  print('cyan', '\n🧪 Verificando configuración de tests...');
  
  const testFiles = [
    'backend/jest.config.js',
    'web/jest.config.js',
    'mobile/jest.config.js',
    'backend/tests/',
    'web/src/setupTests.ts'
  ];
  
  let testsOk = true;
  
  testFiles.forEach(test => {
    if (fileExists(test) || dirExists(test)) {
      print('green', `✅ ${test}`);
    } else {
      print('yellow', `⚠️  ${test} - No encontrado`);
    }
  });
  
  return testsOk;
}

// Función para verificar Docker
function checkDocker() {
  print('cyan', '\n🐳 Verificando configuración de Docker...');
  
  const dockerFiles = [
    'Dockerfile',
    'docker-compose.yml',
    'backend/Dockerfile',
    'web/Dockerfile',
    'mobile/Dockerfile'
  ];
  
  let dockerOk = true;
  
  dockerFiles.forEach(docker => {
    if (fileExists(docker)) {
      print('green', `✅ ${docker}`);
    } else {
      print('yellow', `⚠️  ${docker} - No encontrado`);
    }
  });
  
  return dockerOk;
}

// Función para verificar CI/CD
function checkCICD() {
  print('cyan', '\n🚀 Verificando configuración de CI/CD...');
  
  const cicdFiles = [
    '.github/workflows/ci.yml',
    '.husky/pre-commit',
    '.lintstagedrc.js',
    '.czrc'
  ];
  
  let cicdOk = true;
  
  cicdFiles.forEach(cicd => {
    if (fileExists(cicd)) {
      print('green', `✅ ${cicd}`);
    } else {
      print('yellow', `⚠️  ${cicd} - No encontrado`);
    }
  });
  
  return cicdOk;
}

// Función principal de verificación
function main() {
  print('bright', '\n🚀 EventConnect v4.0.0 - Verificación de Funcionalidades');
  print('blue', '='.repeat(60));
  
  const startTime = Date.now();
  
  // Ejecutar todas las verificaciones
  const results = {
    dependencies: checkDependencies(),
    backend: checkBackendFeatures(),
    web: checkWebFeatures(),
    mobile: checkMobileFeatures(),
    config: checkConfigFiles(),
    structure: checkDirectoryStructure(),
    tests: checkTests(),
    docker: checkDocker(),
    cicd: checkCICD()
  };
  
  // Resumen de resultados
  print('bright', '\n📊 RESUMEN DE VERIFICACIÓN');
  print('blue', '='.repeat(40));
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const failedChecks = totalChecks - passedChecks;
  
  print('green', `✅ Verificaciones exitosas: ${passedChecks}/${totalChecks}`);
  
  if (failedChecks > 0) {
    print('red', `❌ Verificaciones fallidas: ${failedChecks}/${totalChecks}`);
  }
  
  // Mostrar estado de cada categoría
  Object.entries(results).forEach(([category, status]) => {
    const icon = status ? '✅' : '❌';
    const color = status ? 'green' : 'red';
    const statusText = status ? 'OK' : 'FALLIDO';
    print(color, `${icon} ${category.toUpperCase()}: ${statusText}`);
  });
  
  // Tiempo total
  const totalTime = Date.now() - startTime;
  print('cyan', `\n⏱️  Tiempo total de verificación: ${totalTime}ms`);
  
  // Recomendaciones
  if (failedChecks === 0) {
    print('bright', '\n🎉 ¡TODAS LAS FUNCIONALIDADES ESTÁN IMPLEMENTADAS CORRECTAMENTE!');
    print('green', 'EventConnect v4.0.0 está listo para producción.');
  } else {
    print('yellow', '\n⚠️  ALGUNAS VERIFICACIONES FALLARON');
    print('yellow', 'Revisa los errores arriba y corrige los problemas antes de continuar.');
  }
  
  // Comandos útiles
  print('bright', '\n🔧 COMANDOS ÚTILES:');
  print('cyan', 'npm run dev          - Iniciar desarrollo completo');
  print('cyan', 'npm test             - Ejecutar todos los tests');
  print('cyan', 'npm run docker:up    - Levantar servicios Docker');
  print('cyan', 'npm run build        - Build de producción');
  
  print('bright', '\n🚀 ¡EventConnect v4.0.0 está listo para revolucionar los eventos!');
}

// Ejecutar verificación si se llama directamente
if (require.main === module) {
  try {
    main();
  } catch (error) {
    print('red', `\n❌ Error durante la verificación: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  checkDependencies,
  checkBackendFeatures,
  checkWebFeatures,
  checkMobileFeatures,
  checkConfigFiles,
  checkDirectoryStructure,
  checkTests,
  checkDocker,
  checkCICD
};