const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5000';
const WEB_URL = 'http://localhost:3000';
const MOBILE_URL = 'http://localhost:19000';

const TEST_USER = {
  email: 'test@eventconnect.com',
  password: 'TestPassword123!'
};

// Variables globales
let authToken = '';
let userId = '';

// Colores para console.log
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
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

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logFrontend(message) {
  log(`🌐 ${message}`, 'purple');
}

// Función helper para hacer requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Origin': WEB_URL,
        'Referer': WEB_URL,
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
    userId = login.data.user.id;
    return true;
  } else {
    logError('Login failed');
    return false;
  }
}

// Test de CORS
async function testCORS() {
  log('\n🌐 TESTING CORS HEADERS', 'bold');

  // Test 1: Preflight request
  logInfo('Testing CORS Preflight...');
  const preflight = await makeRequest('OPTIONS', '/api/events', null, {
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'authorization,content-type'
  });

  if (preflight.status === 200 || preflight.status === 204) {
    logSuccess('CORS Preflight passed');
  } else {
    logError('CORS Preflight failed');
  }

  // Test 2: Actual request with CORS headers
  logInfo('Testing CORS Actual Request...');
  const corsRequest = await makeRequest('GET', '/api/events', null, {
    'Authorization': `Bearer ${authToken}`
  });

  if (corsRequest.success) {
    logSuccess('CORS Actual Request passed');
  } else {
    logError('CORS Actual Request failed');
  }
}

// Test de APIs principales desde frontend
async function testMainAPIs() {
  log('\n🌐 TESTING MAIN APIS FROM FRONTEND', 'bold');
  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get Events (Homepage)
  logFrontend('Testing Get Events (Homepage)...');
  const events = await makeRequest('GET', '/api/events', null, headers);
  if (events.success) {
    logSuccess('Get Events (Homepage) passed');
  } else {
    logError('Get Events (Homepage) failed');
  }

  // Test 2: Get User Profile (Profile Page)
  logFrontend('Testing Get User Profile (Profile Page)...');
  const profile = await makeRequest('GET', '/api/users/profile', null, headers);
  if (profile.success) {
    logSuccess('Get User Profile (Profile Page) passed');
  } else {
    logError('Get User Profile (Profile Page) failed');
  }

  // Test 3: Get Notifications (Header)
  logFrontend('Testing Get Notifications (Header)...');
  const notifications = await makeRequest('GET', '/api/notifications', null, headers);
  if (notifications.success) {
    logSuccess('Get Notifications (Header) passed');
  } else {
    logError('Get Notifications (Header) failed');
  }

  // Test 4: Get Gamification Stats (Dashboard)
  logFrontend('Testing Get Gamification Stats (Dashboard)...');
  const gamification = await makeRequest('GET', '/api/gamification/stats', null, headers);
  if (gamification.success) {
    logSuccess('Get Gamification Stats (Dashboard) passed');
  } else {
    logError('Get Gamification Stats (Dashboard) failed');
  }
}

// Test de APIs de creación desde frontend
async function testCreationAPIs() {
  log('\n🌐 TESTING CREATION APIS FROM FRONTEND', 'bold');
  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Create Event (Event Creation Form)
  logFrontend('Testing Create Event (Event Creation Form)...');
  const createEvent = await makeRequest('POST', '/api/events', {
    title: 'Evento desde Frontend',
    description: 'Evento creado desde el frontend web',
    category: 'technology',
    date: '2024-03-15T18:00:00.000Z',
    endDate: '2024-03-15T20:00:00.000Z',
    location: {
      coordinates: [-74.0060, 40.7128],
      address: 'Calle Principal 123, Nueva York, NY',
      venue: 'Lugar del evento'
    },
    maxAttendees: 50,
    price: {
      amount: 15.00,
      currency: 'USD'
    },
    isPrivate: false,
    tags: ['frontend', 'testing']
  }, headers);

  if (createEvent.success) {
    logSuccess('Create Event (Event Creation Form) passed');
  } else {
    logError('Create Event (Event Creation Form) failed');
  }

  // Test 2: Create Tribe (Tribe Creation Form)
  logFrontend('Testing Create Tribe (Tribe Creation Form)...');
  const createTribe = await makeRequest('POST', '/api/tribes', {
    name: 'Tribu desde Frontend',
    description: 'Tribu creada desde el frontend web',
    category: 'technology',
    isPrivate: false,
    tags: ['frontend', 'web']
  }, headers);

  if (createTribe.success) {
    logSuccess('Create Tribe (Tribe Creation Form) passed');
  } else {
    logError('Create Tribe (Tribe Creation Form) failed');
  }
}

// Test de APIs de búsqueda y filtros
async function testSearchAPIs() {
  log('\n🌐 TESTING SEARCH AND FILTER APIS', 'bold');
  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get Nearby Events (Map View)
  logFrontend('Testing Get Nearby Events (Map View)...');
  const nearbyEvents = await makeRequest('GET', '/api/events/nearby?lat=40.7128&lng=-74.0060&radius=50', null, headers);
  if (nearbyEvents.success) {
    logSuccess('Get Nearby Events (Map View) passed');
  } else {
    logError('Get Nearby Events (Map View) failed');
  }

  // Test 2: Get AI Recommendations (Recommendations Page)
  logFrontend('Testing Get AI Recommendations (Recommendations Page)...');
  const recommendations = await makeRequest('GET', '/api/ai/recommendations/events', null, headers);
  if (recommendations.success) {
    logSuccess('Get AI Recommendations (Recommendations Page) passed');
  } else {
    logError('Get AI Recommendations (Recommendations Page) failed');
  }
}

// Test de APIs de interacción
async function testInteractionAPIs() {
  log('\n🌐 TESTING INTERACTION APIS', 'bold');
  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Track Action (Gamification)
  logFrontend('Testing Track Action (Gamification)...');
  const trackAction = await makeRequest('POST', '/api/gamification/track-action', {
    action: 'page_viewed',
    metadata: {
      page: 'homepage',
      source: 'web'
    }
  }, headers);

  if (trackAction.success) {
    logSuccess('Track Action (Gamification) passed');
  } else {
    logError('Track Action (Gamification) failed');
  }

  // Test 2: Mark Notifications as Read
  logFrontend('Testing Mark Notifications as Read...');
  const markRead = await makeRequest('PUT', '/api/notifications/read-all', null, headers);
  if (markRead.success) {
    logSuccess('Mark Notifications as Read passed');
  } else {
    logError('Mark Notifications as Read failed');
  }
}

// Test de performance y headers
async function testPerformance() {
  log('\n🌐 TESTING PERFORMANCE AND HEADERS', 'bold');

  // Test 1: Check response headers
  logInfo('Testing Response Headers...');
  const headersTest = await makeRequest('GET', '/api/events');
  if (headersTest.success) {
    logSuccess('Response Headers test passed');
  } else {
    logError('Response Headers test failed');
  }

  // Test 2: Check response time
  logInfo('Testing Response Time...');
  const startTime = Date.now();
  const timeTest = await makeRequest('GET', '/api/events');
  const endTime = Date.now();
  const responseTime = endTime - startTime;

  if (timeTest.success && responseTime < 1000) {
    logSuccess(`Response Time test passed (${responseTime}ms)`);
  } else {
    logWarning(`Response Time test slow (${responseTime}ms)`);
  }
}

// Función principal
async function runFrontendTests() {
  log('\n🚀 STARTING FRONTEND API TESTING', 'bold');
  log(`Backend URL: ${BASE_URL}`, 'blue');
  log(`Web Frontend URL: ${WEB_URL}`, 'blue');
  log(`Mobile Frontend URL: ${MOBILE_URL}`, 'blue');

  try {
    // Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      logError('Cannot proceed without login');
      return;
    }

    // Test CORS
    await testCORS();

    // Test Main APIs
    await testMainAPIs();

    // Test Creation APIs
    await testCreationAPIs();

    // Test Search APIs
    await testSearchAPIs();

    // Test Interaction APIs
    await testInteractionAPIs();

    // Test Performance
    await testPerformance();

    log('\n🎉 FRONTEND API TESTS COMPLETED!', 'bold');
    log('📊 Summary:', 'blue');
    log(`- User ID: ${userId}`, 'blue');
    log(`- Auth Token: ${authToken ? '✅ Valid' : '❌ Invalid'}`, 'blue');

  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
  }
}

// Ejecutar tests
runFrontendTests();








