const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO SINTAXIS JSX - TODOS LOS ARCHIVOS\n');

// Función para verificar si existe un archivo
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

// Función para obtener el contenido de un archivo
const getFileContent = (filePath) => {
  if (!fileExists(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
};

// Función para verificar sintaxis JSX básica
const checkJSXSyntax = (filePath) => {
  const content = getFileContent(filePath);
  if (!content) return { errors: [], warnings: [] };

  const errors = [];
  const warnings = [];
  const lines = content.split('\n');

  // Verificar tags JSX no cerrados
  const openTags = [];
  const closeTags = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Buscar tags de apertura
    const openMatches = line.match(/<([A-Z][a-zA-Z0-9]*)/g);
    if (openMatches) {
      openMatches.forEach(tag => {
        const tagName = tag.substring(1);
        if (!tag.includes('/>')) { // No es un self-closing tag
          openTags.push({ tag: tagName, line: lineNumber });
        }
      });
    }

    // Buscar tags de cierre
    const closeMatches = line.match(/<\/([A-Z][a-zA-Z0-9]*)/g);
    if (closeMatches) {
      closeMatches.forEach(tag => {
        const tagName = tag.substring(2);
        closeTags.push({ tag: tagName, line: lineNumber });
      });
    }

    // Verificar imports faltantes
    if (line.includes('import') && line.includes('from')) {
      const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const importPath = importMatch[1];
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          const fullPath = path.resolve(path.dirname(filePath), importPath);
          if (!fileExists(fullPath) && !fileExists(fullPath + '.js') && !fileExists(fullPath + '.jsx')) {
            warnings.push(`Import no encontrado: ${importPath} (línea ${lineNumber})`);
          }
        }
      }
    }
  });

  // Verificar balance de tags
  const openTagNames = openTags.map(t => t.tag);
  const closeTagNames = closeTags.map(t => t.tag);

  openTagNames.forEach((tagName, index) => {
    const closeIndex = closeTagNames.indexOf(tagName);
    if (closeIndex === -1) {
      errors.push(`Tag <${tagName}> no cerrado (línea ${openTags[index].line})`);
    } else {
      closeTagNames.splice(closeIndex, 1);
    }
  });

  closeTagNames.forEach(tagName => {
    const openIndex = openTagNames.indexOf(tagName);
    if (openIndex === -1) {
      errors.push(`Tag </${tagName}> sin apertura`);
    }
  });

  return { errors, warnings };
};

// Función para verificar archivos específicos
const checkSpecificFiles = () => {
  console.log('📁 VERIFICANDO ARCHIVOS PRINCIPALES:');
  
  const filesToCheck = [
    'mobile-app/App.js',
    'mobile-app/src/screens/main/ProfileScreen.js',
    'mobile-app/src/screens/main/HomeScreen.js',
    'mobile-app/src/screens/main/EventsScreen.js',
    'mobile-app/src/screens/main/TribesScreen.js',
    'mobile-app/src/screens/main/NotificationsScreen.js',
    'mobile-app/src/screens/auth/LoginScreen.js',
    'mobile-app/src/screens/auth/RegisterScreen.js',
    'mobile-app/src/navigation/AppNavigator.js'
  ];

  let totalErrors = 0;
  let totalWarnings = 0;

  filesToCheck.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fileExists(fullPath)) {
      const result = checkJSXSyntax(fullPath);
      
      if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(`\n📄 ${filePath}:`);
        
        if (result.errors.length > 0) {
          console.log('   ❌ ERRORES:');
          result.errors.forEach(error => {
            console.log(`      - ${error}`);
          });
          totalErrors += result.errors.length;
        }
        
        if (result.warnings.length > 0) {
          console.log('   ⚠️  ADVERTENCIAS:');
          result.warnings.forEach(warning => {
            console.log(`      - ${warning}`);
          });
          totalWarnings += result.warnings.length;
        }
      } else {
        console.log(`   ✅ ${filePath}`);
      }
    } else {
      console.log(`   ❌ ${filePath} - No encontrado`);
    }
  });

  return { totalErrors, totalWarnings };
};

// Función para verificar estructura de directorios
const checkAllJSXFiles = () => {
  console.log('\n📂 VERIFICANDO TODOS LOS ARCHIVOS JSX:');
  
  const mobileAppPath = path.join(__dirname, '../mobile-app');
  const jsxFiles = [];

  // Función recursiva para buscar archivos JSX
  const findJSXFiles = (dir) => {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findJSXFiles(fullPath);
      } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
        jsxFiles.push(fullPath);
      }
    });
  };

  findJSXFiles(mobileAppPath);
  
  let totalErrors = 0;
  let totalWarnings = 0;

  jsxFiles.forEach(filePath => {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    const result = checkJSXSyntax(filePath);
    
    if (result.errors.length > 0) {
      console.log(`\n❌ ${relativePath}:`);
      result.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
      totalErrors += result.errors.length;
    }
  });

  return { totalErrors, totalWarnings };
};

// Función principal
const main = () => {
  console.log('🚀 INICIANDO VERIFICACIÓN DE SINTAXIS JSX...\n');
  
  const specificResult = checkSpecificFiles();
  const allResult = checkAllJSXFiles();
  
  const totalErrors = specificResult.totalErrors + allResult.totalErrors;
  const totalWarnings = specificResult.totalWarnings + allResult.totalWarnings;
  
  console.log('\n📊 RESUMEN:');
  console.log(`   - Errores encontrados: ${totalErrors}`);
  console.log(`   - Advertencias encontradas: ${totalWarnings}`);
  
  if (totalErrors === 0) {
    console.log('\n✅ ¡TODOS LOS ARCHIVOS JSX ESTÁN CORRECTOS!');
  } else {
    console.log('\n❌ SE ENCONTRARON ERRORES DE SINTAXIS JSX');
    console.log('\n🔧 RECOMENDACIONES:');
    console.log('   1. Corregir los tags no cerrados');
    console.log('   2. Verificar imports faltantes');
    console.log('   3. Revisar la estructura de componentes');
    console.log('   4. Ejecutar npx expo start --clear después de corregir');
  }
};

// Ejecutar verificación
main();








