#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

console.log('🚀 TESTING FINAL DE INTEGRACIÓN - EventConnect\n');

// Configuración
const BASE_URL = 'http://localhost:5000';
const MOBILE_URL = 'http://localhost:8082';

// Función para hacer peticiones HTTP
async function testEndpoint(url, name, expectedStatus = 200) {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.status === expectedStatus) {
      console.log(`✅ ${name}: OK (${response.status})`);
      return { success: true, status: response.status, data: response.data };
    } else {
      console.log(`❌ ${name}: Unexpected status ${response.status}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Tests
async function runTests() {
  console.log('🔍 PROBANDO COMPONENTES:\n');
  
  // 1. Backend API
  console.log('📡 BACKEND API:');
  const backendTests = [
    { url: `${BASE_URL}/health`, name: 'Health Check' },
    { url: `${BASE_URL}/api/events`, name: 'Events API' },
    { url: `${BASE_URL}/api/tribes`, name: 'Tribes API' },
    { url: `${BASE_URL}/api/auth/test`, name: 'Auth Test', expectedStatus: 404 }, // No existe, pero server responde
  ];
  
  let backendSuccess = 0;
  for (const test of backendTests) {
    const result = await testEndpoint(test.url, test.name, test.expectedStatus || 200);
    if (result.success) backendSuccess++;
  }
  
  console.log(`\n📊 Backend: ${backendSuccess}/${backendTests.length} tests passed\n`);
  
  // 2. Mobile App
  console.log('📱 MOBILE APP:');
  const mobileTests = [
    { url: MOBILE_URL, name: 'Mobile App (Web)' },
  ];
  
  let mobileSuccess = 0;
  for (const test of mobileTests) {
    const result = await testEndpoint(test.url, test.name);
    if (result.success) mobileSuccess++;
  }
  
  console.log(`\n📊 Mobile: ${mobileSuccess}/${mobileTests.length} tests passed\n`);
  
  // 3. Verificar archivos críticos
  console.log('📁 VERIFICANDO ARCHIVOS:\n');
  
  const criticalFiles = [
    'backend-api/.env',
    'mobile-app/.env',
    'web-frontend/.env',
    'mobile-app/src/navigation/AppNavigator.js',
    'mobile-app/src/components/navigation/ModernTabBar.js',
    'backend-api/src/server.js',
  ];
  
  let filesSuccess = 0;
  for (const file of criticalFiles) {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
    if (exists) filesSuccess++;
  }
  
  console.log(`\n📊 Files: ${filesSuccess}/${criticalFiles.length} found\n`);
  
  // 4. Resumen final
  const totalTests = backendTests.length + mobileTests.length;
  const totalSuccess = backendSuccess + mobileSuccess;
  const successRate = ((totalSuccess / totalTests) * 100).toFixed(1);
  
  console.log('🎯 RESUMEN FINAL:\n');
  console.log(`📡 Backend: ${backendSuccess}/${backendTests.length} ✅`);
  console.log(`📱 Mobile: ${mobileSuccess}/${mobileTests.length} ✅`);
  console.log(`📁 Files: ${filesSuccess}/${criticalFiles.length} ✅`);
  console.log(`\n🚀 SUCCESS RATE: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log('\n🎉 ¡INTEGRACIÓN EXITOSA!');
    console.log('\n✅ APLICACIÓN LISTA PARA USO:');
    console.log(`   • Backend: ${BASE_URL}`);
    console.log(`   • Mobile Web: ${MOBILE_URL}`);
    console.log(`   • Mobile Native: Expo Go app`);
  } else {
    console.log('\n⚠️  INTEGRACIÓN PARCIAL - Requiere ajustes');
  }
  
  console.log('\n🔧 PRÓXIMOS PASOS:');
  console.log('1. Configurar Google Maps API Key');
  console.log('2. Configurar Cloudinary para uploads');
  console.log('3. Probar en dispositivo móvil físico');
  console.log('4. Testing de funcionalidades específicas');
}

// Ejecutar tests
runTests().catch(console.error);






