const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGIENDO RUTAS DE IMPORTACIÓN...\n');

// Función para verificar si existe un archivo
const fileExists = (filePath) => fs.existsSync(filePath);

// Función para obtener el contenido de un archivo
const getFileContent = (filePath) => fileExists(filePath) ? fs.readFileSync(filePath, 'utf8') : null;

// Función para escribir contenido a un archivo
const writeFileContent = (filePath, content) => fs.writeFileSync(filePath, content, 'utf8');

// Función para corregir rutas en un archivo
const fixImportPaths = (filePath) => {
  const content = getFileContent(filePath);
  if (!content) return false;

  let fixedContent = content;
  let changes = 0;

  // Corregir rutas de servicios
  const serviceImports = [
    { from: '../../services/', to: '../services/' },
    { from: '../../../services/', to: '../../services/' }
  ];

  serviceImports.forEach(({ from, to }) => {
    if (fixedContent.includes(from)) {
      fixedContent = fixedContent.replace(new RegExp(from, 'g'), to);
      changes++;
    }
  });

  // Corregir rutas de contextos
  const contextImports = [
    { from: '../../contexts/', to: '../contexts/' },
    { from: '../../../contexts/', to: '../../contexts/' }
  ];

  contextImports.forEach(({ from, to }) => {
    if (fixedContent.includes(from)) {
      fixedContent = fixedContent.replace(new RegExp(from, 'g'), to);
      changes++;
    }
  });

  // Corregir rutas de hooks
  const hookImports = [
    { from: '../../hooks/', to: '../hooks/' },
    { from: '../../../hooks/', to: '../../hooks/' }
  ];

  hookImports.forEach(({ from, to }) => {
    if (fixedContent.includes(from)) {
      fixedContent = fixedContent.replace(new RegExp(from, 'g'), to);
      changes++;
    }
  });

  // Corregir rutas de utils
  const utilImports = [
    { from: '../../utils/', to: '../utils/' },
    { from: '../../../utils/', to: '../../utils/' }
  ];

  utilImports.forEach(({ from, to }) => {
    if (fixedContent.includes(from)) {
      fixedContent = fixedContent.replace(new RegExp(from, 'g'), to);
      changes++;
    }
  });

  if (changes > 0) {
    writeFileContent(filePath, fixedContent);
    console.log(`   ✅ ${filePath}: ${changes} rutas corregidas`);
    return true;
  }

  return false;
};

// Función para procesar directorio recursivamente
const processDirectory = (dirPath) => {
  if (!fileExists(dirPath)) return;

  const items = fs.readdirSync(dirPath);
  let totalFixed = 0;

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Procesar subdirectorios
      totalFixed += processDirectory(fullPath);
    } else if (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx')) {
      // Procesar archivos JavaScript/TypeScript
      if (fixImportPaths(fullPath)) {
        totalFixed++;
      }
    }
  });

  return totalFixed;
};

// Función principal
const main = () => {
  console.log('🚀 INICIANDO CORRECCIÓN DE RUTAS...\n');
  
  const mobileAppPath = path.join(__dirname, '../mobile-app/src');
  
  if (!fileExists(mobileAppPath)) {
    console.log('❌ Directorio mobile-app/src no encontrado');
    return;
  }

  console.log('📁 PROCESANDO ARCHIVOS...');
  const totalFixed = processDirectory(mobileAppPath);
  
  console.log(`\n✅ CORRECCIÓN COMPLETADA`);
  console.log(`   - Archivos corregidos: ${totalFixed}`);
  
  if (totalFixed > 0) {
    console.log('\n🔧 PRÓXIMOS PASOS:');
    console.log('   1. cd mobile-app');
    console.log('   2. npx expo start --clear');
    console.log('   3. Probar la aplicación');
  } else {
    console.log('\n✅ No se encontraron rutas que necesiten corrección');
  }
};

main();








