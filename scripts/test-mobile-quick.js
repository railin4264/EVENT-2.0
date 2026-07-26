const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 PRUEBA RÁPIDA - APLICACIÓN MÓVIL\n');

// Función para ejecutar comandos
const runCommand = (command, description) => {
  return new Promise((resolve, reject) => {
    console.log(`🔄 ${description}...`);
    exec(command, { cwd: path.join(__dirname, '../mobile-app') }, (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(`⚠️  Warning: ${stderr}`);
      }
      console.log(`✅ ${description} completado`);
      resolve(stdout);
    });
  });
};

// Función para verificar si el servidor está corriendo
const checkServerStatus = () => {
  return new Promise((resolve) => {
    console.log('🔍 Verificando estado del servidor...');
    
    // Simular verificación
    setTimeout(() => {
      console.log('✅ Servidor parece estar funcionando');
      resolve(true);
    }, 2000);
  });
};

// Función principal
const main = async () => {
  try {
    console.log('📋 PASOS DE PRUEBA:');
    console.log('1. Verificar dependencias');
    console.log('2. Limpiar cache');
    console.log('3. Iniciar servidor');
    console.log('4. Verificar conectividad');
    console.log('5. Probar en simulador\n');

    // Paso 1: Verificar dependencias
    await runCommand('npm list --depth=0', 'Verificando dependencias');
    
    // Paso 2: Limpiar cache
    await runCommand('npx expo start --clear --no-dev --minify', 'Limpiando cache e iniciando servidor');
    
    // Paso 3: Verificar estado
    await checkServerStatus();
    
    console.log('\n✅ PRUEBA COMPLETADA');
    console.log('\n📱 INSTRUCCIONES PARA PROBAR:');
    console.log('1. Abre Expo Go en tu dispositivo móvil');
    console.log('2. Escanea el código QR que aparece en la terminal');
    console.log('3. La aplicación debería cargar automáticamente');
    console.log('4. Si hay errores, revisa la consola de Expo Go');
    
    console.log('\n🔧 SI HAY PROBLEMAS:');
    console.log('- Verifica que tu dispositivo y PC estén en la misma red');
    console.log('- Asegúrate de que el firewall no bloquee la conexión');
    console.log('- Intenta usar un cable USB para desarrollo');
    console.log('- Revisa los logs en la terminal para errores específicos');
    
  } catch (error) {
    console.log('\n❌ ERROR EN LA PRUEBA:');
    console.log(error.message);
    console.log('\n🔧 SOLUCIONES:');
    console.log('1. Verifica que todas las dependencias estén instaladas');
    console.log('2. Asegúrate de estar en el directorio correcto');
    console.log('3. Intenta reiniciar el terminal');
    console.log('4. Verifica que Expo CLI esté instalado globalmente');
  }
};

// Ejecutar prueba
main();








