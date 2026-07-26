const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGIENDO ERRORES JSX COMUNES\n');

// Función para verificar si existe un archivo
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

// Función para obtener el contenido de un archivo
const getFileContent = (filePath) => {
  if (!fileExists(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
};

// Función para escribir contenido a un archivo
const writeFileContent = (filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
};

// Función para corregir errores comunes de JSX
const fixJSXErrors = (filePath) => {
  const content = getFileContent(filePath);
  if (!content) return { fixed: false, errors: [] };

  let fixedContent = content;
  const errors = [];

  // 1. Corregir tags Stats mal cerrados
  if (fixedContent.includes('</Stats>')) {
    fixedContent = fixedContent.replace(/<\/Stats>/g, '</View>');
    errors.push('Corregido: </Stats> -> </View>');
  }

  // 2. Corregir imports de Ionicons faltantes
  if (fixedContent.includes('<Ionicons') && !fixedContent.includes("import { Ionicons } from '@expo/vector-icons'")) {
    const importLine = "import { Ionicons } from '@expo/vector-icons';";
    if (!fixedContent.includes(importLine)) {
      // Buscar la línea después de los imports de react-native
      const reactNativeImportIndex = fixedContent.indexOf("} from 'react-native';");
      if (reactNativeImportIndex !== -1) {
        const insertIndex = fixedContent.indexOf('\n', reactNativeImportIndex) + 1;
        fixedContent = fixedContent.slice(0, insertIndex) + importLine + '\n' + fixedContent.slice(insertIndex);
        errors.push('Agregado: import Ionicons');
      }
    }
  }

  // 3. Corregir imports de LinearGradient faltantes
  if (fixedContent.includes('<LinearGradient') && !fixedContent.includes("import { LinearGradient } from 'expo-linear-gradient'")) {
    const importLine = "import { LinearGradient } from 'expo-linear-gradient';";
    if (!fixedContent.includes(importLine)) {
      const reactNativeImportIndex = fixedContent.indexOf("} from 'react-native';");
      if (reactNativeImportIndex !== -1) {
        const insertIndex = fixedContent.indexOf('\n', reactNativeImportIndex) + 1;
        fixedContent = fixedContent.slice(0, insertIndex) + importLine + '\n' + fixedContent.slice(insertIndex);
        errors.push('Agregado: import LinearGradient');
      }
    }
  }

  // 4. Corregir imports de Animatable faltantes
  if (fixedContent.includes('<Animatable.') && !fixedContent.includes("import * as Animatable from 'react-native-animatable'")) {
    const importLine = "import * as Animatable from 'react-native-animatable';";
    if (!fixedContent.includes(importLine)) {
      const reactNativeImportIndex = fixedContent.indexOf("} from 'react-native';");
      if (reactNativeImportIndex !== -1) {
        const insertIndex = fixedContent.indexOf('\n', reactNativeImportIndex) + 1;
        fixedContent = fixedContent.slice(0, insertIndex) + importLine + '\n' + fixedContent.slice(insertIndex);
        errors.push('Agregado: import Animatable');
      }
    }
  }

  // 5. Corregir imports de ImagePicker faltantes
  if (fixedContent.includes('ImagePicker') && !fixedContent.includes("import * as ImagePicker from 'expo-image-picker'")) {
    const importLine = "import * as ImagePicker from 'expo-image-picker';";
    if (!fixedContent.includes(importLine)) {
      const reactNativeImportIndex = fixedContent.indexOf("} from 'react-native';");
      if (reactNativeImportIndex !== -1) {
        const insertIndex = fixedContent.indexOf('\n', reactNativeImportIndex) + 1;
        fixedContent = fixedContent.slice(0, insertIndex) + importLine + '\n' + fixedContent.slice(insertIndex);
        errors.push('Agregado: import ImagePicker');
      }
    }
  }

  // 6. Corregir imports de lucide-react-native faltantes
  const lucideIcons = [
    'Calendar', 'Users', 'Bell', 'Clock', 'MapPin', 'ChevronRight', 'TrendingUp',
    'Star', 'Heart', 'MessageCircle', 'Share', 'Bookmark', 'Eye', 'MoreVertical',
    'ArrowLeft', 'Phone', 'Video', 'Camera', 'Mic', 'Send', 'Plus', 'Search',
    'Filter', 'Crown', 'Shield', 'UserPlus', 'UserMinus', 'Settings', 'Edit',
    'Link', 'Instagram', 'Twitter', 'Activity', 'Award', 'ThumbsUp', 'Flag',
    'RefreshControl', 'FlatList', 'TextInput', 'ActivityIndicator', 'StatusBar'
  ];

  const missingLucideIcons = lucideIcons.filter(icon => 
    fixedContent.includes(`<${icon}`) && !fixedContent.includes(`import { ${icon} } from 'lucide-react-native'`)
  );

  if (missingLucideIcons.length > 0) {
    const importLine = `import { ${missingLucideIcons.join(', ')} } from 'lucide-react-native';`;
    if (!fixedContent.includes("import {") && !fixedContent.includes("} from 'lucide-react-native'")) {
      const reactNativeImportIndex = fixedContent.indexOf("} from 'react-native';");
      if (reactNativeImportIndex !== -1) {
        const insertIndex = fixedContent.indexOf('\n', reactNativeImportIndex) + 1;
        fixedContent = fixedContent.slice(0, insertIndex) + importLine + '\n' + fixedContent.slice(insertIndex);
        errors.push(`Agregado: import ${missingLucideIcons.join(', ')}`);
      }
    }
  }

  // 7. Corregir tags JSX mal cerrados (búsqueda básica)
  const selfClosingTags = ['Ionicons', 'Image', 'StatusBar', 'ActivityIndicator'];
  selfClosingTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>[^<]*</${tag}>`, 'g');
    if (regex.test(fixedContent)) {
      fixedContent = fixedContent.replace(regex, (match) => {
        const openTag = match.match(new RegExp(`<${tag}[^>]*>`))[0];
        return openTag.replace('>', ' />');
      });
      errors.push(`Corregido: ${tag} tags auto-cerrados`);
    }
  });

  // Solo escribir si hay cambios
  if (fixedContent !== content) {
    writeFileContent(filePath, fixedContent);
    return { fixed: true, errors };
  }

  return { fixed: false, errors: [] };
};

// Función para corregir archivos específicos
const fixSpecificFiles = () => {
  console.log('📁 CORRIGIENDO ARCHIVOS PRINCIPALES:');
  
  const filesToFix = [
    'mobile-app/src/screens/main/ProfileScreen.js',
    'mobile-app/src/screens/main/HomeScreen.js',
    'mobile-app/src/screens/main/EventsScreen.js',
    'mobile-app/src/screens/main/TribesScreen.js',
    'mobile-app/src/screens/main/NotificationsScreen.js',
    'mobile-app/src/screens/auth/LoginScreen.js',
    'mobile-app/src/screens/auth/RegisterScreen.js',
    'mobile-app/src/navigation/AppNavigator.js'
  ];

  let totalFixed = 0;
  let totalErrors = 0;

  filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fileExists(fullPath)) {
      const result = fixJSXErrors(fullPath);
      
      if (result.fixed) {
        console.log(`\n✅ ${filePath}:`);
        result.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
        totalFixed++;
        totalErrors += result.errors.length;
      } else {
        console.log(`   ✅ ${filePath} - Sin errores`);
      }
    } else {
      console.log(`   ❌ ${filePath} - No encontrado`);
    }
  });

  return { totalFixed, totalErrors };
};

// Función para corregir todos los archivos JSX
const fixAllJSXFiles = () => {
  console.log('\n📂 CORRIGIENDO TODOS LOS ARCHIVOS JSX:');
  
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
  
  let totalFixed = 0;
  let totalErrors = 0;

  jsxFiles.forEach(filePath => {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    const result = fixJSXErrors(filePath);
    
    if (result.fixed) {
      console.log(`\n✅ ${relativePath}:`);
      result.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
      totalFixed++;
      totalErrors += result.errors.length;
    }
  });

  return { totalFixed, totalErrors };
};

// Función principal
const main = () => {
  console.log('🚀 INICIANDO CORRECCIÓN AUTOMÁTICA DE ERRORES JSX...\n');
  
  const specificResult = fixSpecificFiles();
  const allResult = fixAllJSXFiles();
  
  const totalFixed = specificResult.totalFixed + allResult.totalFixed;
  const totalErrors = specificResult.totalErrors + allResult.totalErrors;
  
  console.log('\n📊 RESUMEN:');
  console.log(`   - Archivos corregidos: ${totalFixed}`);
  console.log(`   - Errores corregidos: ${totalErrors}`);
  
  if (totalFixed > 0) {
    console.log('\n✅ CORRECCIÓN COMPLETADA');
    console.log('\n🔧 PRÓXIMOS PASOS:');
    console.log('   1. Ejecutar: npx expo start --clear');
    console.log('   2. Verificar que la aplicación compile');
    console.log('   3. Si persisten errores, corregir manualmente');
  } else {
    console.log('\n✅ NO SE ENCONTRARON ERRORES PARA CORREGIR');
  }
};

// Ejecutar corrección
main();








