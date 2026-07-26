const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@eventconnect.com',
  password: 'TestPassword123!'
};

// Variables globales
let authToken = '';

// Colores para console.log
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Función helper para hacer requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
}

// Test de autenticación
async function login() {
  logInfo('Logging in...');
  const login = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (login.success) {
    logSuccess('Login successful');
    authToken = login.data.token;
    return true;
  } else {
    logError('Login failed');
    return false;
  }
}

// Test de gamificación
async function testGamification() {
  log('\n🎮 TESTING GAMIFICATION (FIXED)', 'bold');

  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get User Profile Stats
  logInfo('Testing Get User Profile Stats...');
  const profile = await makeRequest('GET', '/api/gamification/profile', null, headers);
  if (profile.success) {
    logSuccess('Get User Profile Stats passed');
    console.log('Profile data:', JSON.stringify(profile.data, null, 2));
  } else {
    logError('Get User Profile Stats failed');
    console.log('Error:', profile.error);
  }

  // Test 2: Get Gamification Stats
  logInfo('Testing Get Gamification Stats...');
  const stats = await makeRequest('GET', '/api/gamification/stats', null, headers);
  if (stats.success) {
    logSuccess('Get Gamification Stats passed');
    console.log('Stats data:', JSON.stringify(stats.data, null, 2));
  } else {
    logError('Get Gamification Stats failed');
    console.log('Error:', stats.error);
  }
}

// Función principal
async function runTest() {
  log('\n🔧 TESTING GAMIFICATION FIX', 'bold');
  log(`Base URL: ${BASE_URL}`, 'blue');

  try {
    // Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      logError('Cannot proceed without login');
      return;
    }

    // Test Gamification
    await testGamification();

    log('\n🎉 GAMIFICATION TEST COMPLETED!', 'bold');

  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
  }
}

// Ejecutar test
runTest();








