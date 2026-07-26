const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO COMPLETO DE ERRORES - APLICACIÓN MÓVIL\n');

// Función para verificar si existe un archivo
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

// Función para verificar si existe un directorio
const dirExists = (dirPath) => {
  return fs.existsSync(dirPath);
};

// Función para listar archivos en un directorio
const listFiles = (dirPath) => {
  if (!dirExists(dirPath)) return [];
  return fs.readdirSync(dirPath);
};

// Función para obtener el contenido de un archivo
const getFileContent = (filePath) => {
  if (!fileExists(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
};

// Función para verificar imports en un archivo
const checkImports = (filePath, requiredImports) => {
  const content = getFileContent(filePath);
  if (!content) return { exists: false, imports: {} };
  
  const results = {};
  requiredImports.forEach(importName => {
    results[importName] = content.includes(importName);
  });
  
  return { exists: true, imports: results };
};

// Función para verificar estructura de archivos críticos
const checkCriticalFiles = () => {
  console.log('📁 VERIFICANDO ARCHIVOS CRÍTICOS:');
  
  const criticalFiles = [
    { path: 'mobile-app/App.js', description: 'Archivo principal de la app' },
    { path: 'mobile-app/package.json', description: 'Configuración de dependencias' },
    { path: 'mobile-app/app.json', description: 'Configuración de Expo' },
    { path: 'mobile-app/babel.config.js', description: 'Configuración de Babel' },
    { path: 'mobile-app/src/navigation/AppNavigator.js', description: 'Navegación principal' },
    { path: 'mobile-app/src/contexts/AuthContext.js', description: 'Contexto de autenticación' },
    { path: 'mobile-app/src/contexts/ThemeContext.js', description: 'Contexto de tema' },
    { path: 'mobile-app/src/services/api.js', description: 'Cliente API' }
  ];

  criticalFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file.path);
    const exists = fileExists(fullPath);
    console.log(`   ${exists ? '✅' : '❌'} ${file.path} - ${file.description}`);
    
    if (!exists) {
      console.log(`      ⚠️  ERROR: ${file.path} no existe`);
    }
  });
};

// Función para verificar dependencias
const checkDependencies = () => {
  console.log('\n📦 VERIFICANDO DEPENDENCIAS:');
  
  const packagePath = path.join(__dirname, '../mobile-app/package.json');
  if (!fileExists(packagePath)) {
    console.log('   ❌ package.json no encontrado');
    return;
  }

  const packageJson = JSON.parse(getFileContent(packagePath));
  const dependencies = packageJson.dependencies || {};
  
  const requiredDeps = [
    'expo',
    'react',
    'react-native',
    '@react-navigation/native',
    '@react-navigation/stack',
    '@react-navigation/bottom-tabs',
    '@react-native-async-storage/async-storage',
    'axios'
  ];

  requiredDeps.forEach(dep => {
    const hasDep = dependencies[dep];
    console.log(`   ${hasDep ? '✅' : '❌'} ${dep} ${hasDep ? `(${dependencies[dep]})` : ''}`);
  });
};

// Función para verificar estructura de directorios
const checkDirectoryStructure = () => {
  console.log('\n📂 VERIFICANDO ESTRUCTURA DE DIRECTORIOS:');
  
  const mobileAppPath = path.join(__dirname, '../mobile-app');
  const requiredDirs = [
    'src',
    'src/components',
    'src/contexts',
    'src/hooks',
    'src/navigation',
    'src/screens',
    'src/services',
    'src/utils',
    'assets'
  ];

  requiredDirs.forEach(dir => {
    const fullPath = path.join(mobileAppPath, dir);
    const exists = dirExists(fullPath);
    console.log(`   ${exists ? '✅' : '❌'} ${dir}`);
    
    if (!exists) {
      console.log(`      ⚠️  ERROR: Directorio ${dir} no existe`);
    }
  });
};

// Función para verificar imports en App.js
const checkAppJsImports = () => {
  console.log('\n🔗 VERIFICANDO IMPORTS EN App.js:');
  
  const appJsPath = path.join(__dirname, '../mobile-app/App.js');
  const requiredImports = [
    'ThemeProvider',
    'AuthProvider',
    'AppNavigator',
    'StatusBar'
  ];

  const result = checkImports(appJsPath, requiredImports);
  
  if (!result.exists) {
    console.log('   ❌ App.js no encontrado');
    return;
  }

  Object.entries(result.imports).forEach(([importName, found]) => {
    console.log(`   ${found ? '✅' : '❌'} ${importName}`);
  });
};

// Función para verificar pantallas principales
const checkMainScreens = () => {
  console.log('\n📱 VERIFICANDO PANTALLAS PRINCIPALES:');
  
  const screensPath = path.join(__dirname, '../mobile-app/src/screens');
  const mainScreens = [
    'LoadingScreen.js',
    'auth/LoginScreen.js',
    'auth/RegisterScreen.js',
    'main/HomeScreen.js',
    'main/EventsScreen.js',
    'main/TribesScreen.js',
    'main/ProfileScreen.js',
    'main/NotificationsScreen.js'
  ];

  mainScreens.forEach(screen => {
    const fullPath = path.join(screensPath, screen);
    const exists = fileExists(fullPath);
    console.log(`   ${exists ? '✅' : '❌'} ${screen}`);
  });
};

// Función para verificar servicios
const checkServices = () => {
  console.log('\n🔧 VERIFICANDO SERVICIOS:');
  
  const servicesPath = path.join(__dirname, '../mobile-app/src/services');
  const requiredServices = [
    'api.js',
    'AuthService.js',
    'EventsService.js',
    'ChatService.js',
    'SearchService.js',
    'UserProfileService.js',
    'ConfigService.js',
    'TribesService.js'
  ];

  requiredServices.forEach(service => {
    const fullPath = path.join(servicesPath, service);
    const exists = fileExists(fullPath);
    console.log(`   ${exists ? '✅' : '❌'} ${service}`);
  });
};

// Función para verificar configuración de Expo
const checkExpoConfig = () => {
  console.log('\n⚙️ VERIFICANDO CONFIGURACIÓN DE EXPO:');
  
  const appJsonPath = path.join(__dirname, '../mobile-app/app.json');
  if (!fileExists(appJsonPath)) {
    console.log('   ❌ app.json no encontrado');
    return;
  }

  try {
    const appJson = JSON.parse(getFileContent(appJsonPath));
    console.log('   ✅ app.json válido');
    console.log(`   📱 Nombre: ${appJson.expo?.name || 'No definido'}`);
    console.log(`   📦 Slug: ${appJson.expo?.slug || 'No definido'}`);
    console.log(`   🎯 Platform: ${appJson.expo?.platforms?.join(', ') || 'No definido'}`);
  } catch (error) {
    console.log('   ❌ app.json inválido');
  }
};

// Función para verificar errores comunes
const checkCommonErrors = () => {
  console.log('\n🚨 VERIFICANDO ERRORES COMUNES:');
  
  // Verificar si App.js tiene export default
  const appJsPath = path.join(__dirname, '../mobile-app/App.js');
  const appJsContent = getFileContent(appJsPath);
  
  if (appJsContent) {
    const hasDefaultExport = appJsContent.includes('export default');
    console.log(`   ${hasDefaultExport ? '✅' : '❌'} App.js tiene export default`);
    
    const hasThemeProvider = appJsContent.includes('ThemeProvider');
    console.log(`   ${hasThemeProvider ? '✅' : '❌'} App.js incluye ThemeProvider`);
    
    const hasAuthProvider = appJsContent.includes('AuthProvider');
    console.log(`   ${hasAuthProvider ? '✅' : '❌'} App.js incluye AuthProvider`);
  }

  // Verificar si package.json tiene main correcto
  const packagePath = path.join(__dirname, '../mobile-app/package.json');
  const packageContent = getFileContent(packagePath);
  
  if (packageContent) {
    try {
      const packageJson = JSON.parse(packageContent);
      const mainField = packageJson.main;
      console.log(`   ${mainField === './App.js' ? '✅' : '❌'} package.json main: ${mainField}`);
    } catch (error) {
      console.log('   ❌ package.json inválido');
    }
  }
};

// Función para generar recomendaciones
const generateRecommendations = () => {
  console.log('\n💡 RECOMENDACIONES PARA SOLUCIONAR ERRORES:');
  
  console.log('\n1. 📁 DIRECTORIO ASSETS:');
  console.log('   - Crear directorio assets en la raíz del proyecto');
  console.log('   - mkdir assets');
  
  console.log('\n2. 🔧 DEPENDENCIAS FALTANTES:');
  console.log('   - Ejecutar: npm install');
  console.log('   - Verificar que todas las dependencias estén instaladas');
  
  console.log('\n3. 🚀 INICIAR APLICACIÓN:');
  console.log('   - Navegar a mobile-app: cd mobile-app');
  console.log('   - Limpiar cache: npx expo start --clear');
  console.log('   - Si persisten errores: npx expo install --fix');
  
  console.log('\n4. 🔄 REINICIAR METRO:');
  console.log('   - Detener el servidor (Ctrl+C)');
  console.log('   - Limpiar cache: npx expo start -c');
  console.log('   - Reiniciar: npx expo start');
  
  console.log('\n5. 📱 VERIFICAR SIMULADOR:');
  console.log('   - Asegurar que el simulador esté funcionando');
  console.log('   - Verificar conexión de red');
  console.log('   - Probar en dispositivo físico si es posible');
};

// Función principal
const main = () => {
  console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO...\n');
  
  checkCriticalFiles();
  checkDependencies();
  checkDirectoryStructure();
  checkAppJsImports();
  checkMainScreens();
  checkServices();
  checkExpoConfig();
  checkCommonErrors();
  generateRecommendations();
  
  console.log('\n✅ DIAGNÓSTICO COMPLETADO');
  console.log('\n📋 RESUMEN DE ACCIONES NECESARIAS:');
  console.log('   1. Crear directorio assets');
  console.log('   2. Verificar todas las dependencias');
  console.log('   3. Corregir imports faltantes');
  console.log('   4. Limpiar cache y reiniciar');
  console.log('   5. Probar en simulador/dispositivo');
};

// Ejecutar diagnóstico
main();








