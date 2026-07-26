const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@eventconnect.com',
  password: 'TestPassword123!'
};

// Variables globales
let authToken = '';
let userId = '';
let chatId = '';
let messageId = '';

// Colores para console.log
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
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

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
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
    userId = login.data.user.id;
    return true;
  } else {
    logError('Login failed');
    return false;
  }
}

// Tests de Chat
async function testChat() {
  log('\n💬 TESTING CHAT API', 'bold');
  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Create Direct Chat
  logInfo('Testing Create Direct Chat...');
  const createDirectChat = await makeRequest('POST', '/api/chat/direct', {
    userId: userId // Self chat for testing
  }, headers);

  if (createDirectChat.success) {
    logSuccess('Create Direct Chat passed');
    chatId = createDirectChat.data.chat.id;
  } else {
    logError('Create Direct Chat failed');
    console.log('Error:', createDirectChat.error);
  }

  // Test 2: Create Group Chat
  logInfo('Testing Create Group Chat...');
  const createGroupChat = await makeRequest('POST', '/api/chat/group', {
    name: 'Grupo de Testing Automatizado',
    description: 'Chat grupal creado por script de testing',
    participantIds: [userId]
  }, headers);

  if (createGroupChat.success) {
    logSuccess('Create Group Chat passed');
    if (!chatId) chatId = createGroupChat.data._id;
  } else {
    logError('Create Group Chat failed');
    console.log('Error:', createGroupChat.error);
  }

  // Test 3: Get User Chats
  logInfo('Testing Get User Chats...');
  const getUserChats = await makeRequest('GET', '/api/chat', null, headers);
  if (getUserChats.success) {
    logSuccess('Get User Chats passed');
  } else {
    logError('Get User Chats failed');
  }

  // Test 4: Send Message (if we have a chat)
  if (chatId) {
    logInfo('Testing Send Message...');
    const sendMessage = await makeRequest('POST', `/api/chat/${chatId}/messages`, {
      content: 'Mensaje de prueba automatizado',
      type: 'text'
    }, headers);

    if (sendMessage.success) {
      logSuccess('Send Message passed');
      messageId = sendMessage.data.message._id || sendMessage.data.message.id;
    } else {
      logError('Send Message failed');
      console.log('Error:', sendMessage.error);
    }

    // Test 5: Get Chat Messages
    logInfo('Testing Get Chat Messages...');
    const getMessages = await makeRequest('GET', `/api/chat/${chatId}/messages`, null, headers);
    if (getMessages.success) {
      logSuccess('Get Chat Messages passed');
    } else {
      logError('Get Chat Messages failed');
    }
  }
}

// Tests de Upload
async function testUpload() {
  log('\n📁 TESTING UPLOAD API', 'bold');
  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get Upload URL
  logInfo('Testing Get Upload URL...');
  const getUploadUrl = await makeRequest('POST', '/api/upload/url', {
    fileName: 'test-image.jpg',
    fileType: 'image/jpeg',
    folder: 'avatars'
  }, headers);

  if (getUploadUrl.success) {
    logSuccess('Get Upload URL passed');
  } else {
    logError('Get Upload URL failed');
    console.log('Error:', getUploadUrl.error);
  }

  // Test 2: Get Upload Stats
  logInfo('Testing Get Upload Stats...');
  const getUploadStats = await makeRequest('GET', '/api/upload/stats', null, headers);
  if (getUploadStats.success) {
    logSuccess('Get Upload Stats passed');
  } else {
    logError('Get Upload Stats failed');
  }
}

// Tests de Maps
async function testMaps() {
  log('\n🗺️ TESTING MAPS API', 'bold');
  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get Nearby Places
  logInfo('Testing Get Nearby Places...');
  const nearbyPlaces = await makeRequest('GET', '/api/maps/nearby?lat=40.7128&lng=-74.0060&radius=1000&type=restaurant', null, headers);
  if (nearbyPlaces.success) {
    logSuccess('Get Nearby Places passed');
  } else {
    logError('Get Nearby Places failed');
    console.log('Error:', nearbyPlaces.error);
  }

  // Test 2: Geocode Address
  logInfo('Testing Geocode Address...');
  const geocode = await makeRequest('GET', '/api/maps/geocode?address=Times Square, New York', null, headers);
  if (geocode.success) {
    logSuccess('Geocode Address passed');
  } else {
    logError('Geocode Address failed');
    console.log('Error:', geocode.error);
  }

  // Test 3: Reverse Geocode
  logInfo('Testing Reverse Geocode...');
  const reverseGeocode = await makeRequest('GET', '/api/maps/reverse-geocode?lat=40.7580&lng=-73.9855', null, headers);
  if (reverseGeocode.success) {
    logSuccess('Reverse Geocode passed');
  } else {
    logError('Reverse Geocode failed');
    console.log('Error:', reverseGeocode.error);
  }
}

// Tests de Search
async function testSearch() {
  log('\n🔍 TESTING SEARCH API', 'bold');
  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Search Events
  logInfo('Testing Search Events...');
  const searchEvents = await makeRequest('GET', '/api/search/events?q=technology&category=technology', null, headers);
  if (searchEvents.success) {
    logSuccess('Search Events passed');
  } else {
    logError('Search Events failed');
    console.log('Error:', searchEvents.error);
  }

  // Test 2: Search Users
  logInfo('Testing Search Users...');
  const searchUsers = await makeRequest('GET', '/api/search/users?q=test', null, headers);
  if (searchUsers.success) {
    logSuccess('Search Users passed');
  } else {
    logError('Search Users failed');
    console.log('Error:', searchUsers.error);
  }

  // Test 3: Search Tribes
  logInfo('Testing Search Tribes...');
  const searchTribes = await makeRequest('GET', '/api/search/tribes?q=tech', null, headers);
  if (searchTribes.success) {
    logSuccess('Search Tribes passed');
  } else {
    logError('Search Tribes failed');
    console.log('Error:', searchTribes.error);
  }
}

// Función principal
async function runSpecificTests() {
  log('\n🚀 STARTING SPECIFIC API TESTING', 'bold');
  log(`Base URL: ${BASE_URL}`, 'blue');

  try {
    // Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      logError('Cannot proceed without login');
      return;
    }

    // Test Chat
    await testChat();

    // Test Upload
    await testUpload();

    // Test Maps
    await testMaps();

    // Test Search
    await testSearch();

    log('\n🎉 SPECIFIC API TESTS COMPLETED!', 'bold');
    log('📊 Summary:', 'blue');
    log(`- User ID: ${userId}`, 'blue');
    log(`- Chat ID: ${chatId}`, 'blue');
    log(`- Message ID: ${messageId}`, 'blue');

  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
  }
}

// Ejecutar tests
runSpecificTests();
