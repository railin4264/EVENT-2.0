const fs = require('fs');
const path = require('path');

console.log('🔄 ESTRATEGIA COMBINADA: CORRECCIÓN + REFERENCIA\n');

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

// Función para copiar archivo
const copyFile = (sourcePath, targetPath) => {
  if (fileExists(sourcePath)) {
    const content = getFileContent(sourcePath);
    writeFileContent(targetPath, content);
    return true;
  }
  return false;
};

// Función para listar archivos en un directorio
const listFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath);
};

// Función para crear directorio si no existe
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Función para corregir errores JSX básicos
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

  // Solo escribir si hay cambios
  if (fixedContent !== content) {
    writeFileContent(filePath, fixedContent);
    return { fixed: true, errors };
  }

  return { fixed: false, errors: [] };
};

// Función para usar archivos de referencia
const useReferenceFiles = () => {
  console.log('📁 USANDO ARCHIVOS DE REFERENCIA:');
  
  const referenceDir = path.join(__dirname, '../OLD/mobile-final');
  const targetDir = path.join(__dirname, '../mobile-app');
  
  if (!fileExists(referenceDir)) {
    console.log('   ❌ Directorio de referencia no encontrado');
    return { copied: 0, errors: 0 };
  }

  let copied = 0;
  let errors = 0;

  // 1. Copiar App.js de referencia
  const appSource = path.join(referenceDir, 'App.js');
  const appTarget = path.join(targetDir, 'App.js');
  
  if (copyFile(appSource, appTarget)) {
    console.log('   ✅ App.js copiado de referencia');
    copied++;
  } else {
    console.log('   ❌ Error copiando App.js');
    errors++;
  }

  // 2. Copiar package.json de referencia
  const packageSource = path.join(referenceDir, 'package.json');
  const packageTarget = path.join(targetDir, 'package.json');
  
  if (copyFile(packageSource, packageTarget)) {
    console.log('   ✅ package.json copiado de referencia');
    copied++;
  } else {
    console.log('   ❌ Error copiando package.json');
    errors++;
  }

  // 3. Copiar app.json de referencia
  const appJsonSource = path.join(referenceDir, 'app.json');
  const appJsonTarget = path.join(targetDir, 'app.json');
  
  if (copyFile(appJsonSource, appJsonTarget)) {
    console.log('   ✅ app.json copiado de referencia');
    copied++;
  } else {
    console.log('   ❌ Error copiando app.json');
    errors++;
  }

  // 4. Copiar babel.config.js de referencia
  const babelSource = path.join(referenceDir, 'babel.config.js');
  const babelTarget = path.join(targetDir, 'babel.config.js');
  
  if (copyFile(babelSource, babelTarget)) {
    console.log('   ✅ babel.config.js copiado de referencia');
    copied++;
  } else {
    console.log('   ❌ Error copiando babel.config.js');
    errors++;
  }

  // 5. Copiar directorios completos
  const dirsToCopy = ['src/contexts', 'src/navigation', 'src/services', 'src/hooks', 'src/utils'];
  
  dirsToCopy.forEach(dir => {
    const sourceDir = path.join(referenceDir, dir);
    const targetDirPath = path.join(targetDir, dir);
    
    if (fileExists(sourceDir)) {
      ensureDir(targetDirPath);
      
      const files = listFiles(sourceDir);
      files.forEach(file => {
        const sourceFile = path.join(sourceDir, file);
        const targetFile = path.join(targetDirPath, file);
        
        // Verificar si es un archivo, no un directorio
        if (fs.statSync(sourceFile).isFile()) {
          if (copyFile(sourceFile, targetFile)) {
            console.log(`   ✅ ${dir}/${file} copiado`);
            copied++;
          } else {
            console.log(`   ❌ Error copiando ${dir}/${file}`);
            errors++;
          }
        }
      });
    }
  });

  return { copied, errors };
};

// Función para crear pantallas básicas funcionales
const createBasicScreens = () => {
  console.log('\n📱 CREANDO PANTALLAS BÁSICAS FUNCIONALES:');
  
  const screensDir = path.join(__dirname, '../mobile-app/src/screens');
  ensureDir(screensDir);
  ensureDir(path.join(screensDir, 'auth'));
  ensureDir(path.join(screensDir, 'main'));

  // 1. Crear LoadingScreen básica
  const loadingScreen = `import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Cargando EventConnect...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#666666',
  },
});

export default LoadingScreen;`;

  writeFileContent(path.join(screensDir, 'LoadingScreen.js'), loadingScreen);
  console.log('   ✅ LoadingScreen.js creada');

  // 2. Crear HomeScreen básica
  const homeScreen = `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>EventConnect</Text>
        <Text style={styles.subtitle}>¡Bienvenido a la aplicación!</Text>
        <Text style={styles.description}>
          Esta es la pantalla principal de EventConnect.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default HomeScreen;`;

  writeFileContent(path.join(screensDir, 'main/HomeScreen.js'), homeScreen);
  console.log('   ✅ HomeScreen.js creada');

  // 3. Crear LoginScreen básica
  const loginScreen = `import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Aquí iría la lógica de login
    console.log('Login:', { email, password });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>Iniciar Sesión</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;`;

  writeFileContent(path.join(screensDir, 'auth/LoginScreen.js'), loginScreen);
  console.log('   ✅ LoginScreen.js creada');

  return 3; // Número de pantallas creadas
};

// Función para corregir archivos existentes
const fixExistingFiles = () => {
  console.log('\n🔧 CORRIGIENDO ARCHIVOS EXISTENTES:');
  
  const filesToFix = [
    'mobile-app/src/screens/main/ProfileScreen.js',
    'mobile-app/src/screens/main/EventsScreen.js',
    'mobile-app/src/screens/main/TribesScreen.js',
    'mobile-app/src/screens/main/NotificationsScreen.js',
    'mobile-app/src/navigation/AppNavigator.js'
  ];

  let totalFixed = 0;
  let totalErrors = 0;

  filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fileExists(fullPath)) {
      const result = fixJSXErrors(fullPath);
      
      if (result.fixed) {
        console.log(`   ✅ ${filePath}: ${result.errors.length} errores corregidos`);
        totalFixed++;
        totalErrors += result.errors.length;
      } else {
        console.log(`   ✅ ${filePath} - Sin errores`);
      }
    }
  });

  return { totalFixed, totalErrors };
};

// Función principal
const main = () => {
  console.log('🚀 INICIANDO ESTRATEGIA COMBINADA...\n');
  
  // Paso 1: Usar archivos de referencia
  const referenceResult = useReferenceFiles();
  
  // Paso 2: Crear pantallas básicas
  const screensCreated = createBasicScreens();
  
  // Paso 3: Corregir archivos existentes
  const fixResult = fixExistingFiles();
  
  console.log('\n📊 RESUMEN COMPLETO:');
  console.log(`   - Archivos de referencia copiados: ${referenceResult.copied}`);
  console.log(`   - Errores en copia: ${referenceResult.errors}`);
  console.log(`   - Pantallas básicas creadas: ${screensCreated}`);
  console.log(`   - Archivos corregidos: ${fixResult.totalFixed}`);
  console.log(`   - Errores corregidos: ${fixResult.totalErrors}`);
  
  console.log('\n✅ ESTRATEGIA COMBINADA COMPLETADA');
  console.log('\n🔧 PRÓXIMOS PASOS:');
  console.log('   1. Ejecutar: cd mobile-app && npm install');
  console.log('   2. Ejecutar: npx expo start --clear');
  console.log('   3. Verificar que la aplicación compile');
  console.log('   4. Probar en simulador/dispositivo');
  
  console.log('\n📱 LA APLICACIÓN DEBERÍA FUNCIONAR AHORA CON:');
  console.log('   - Estructura completa de archivos');
  console.log('   - Pantallas básicas funcionales');
  console.log('   - Navegación configurada');
  console.log('   - Contextos y servicios');
};

// Ejecutar estrategia combinada
main();
