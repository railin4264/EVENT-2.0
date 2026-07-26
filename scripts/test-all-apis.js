const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@eventconnect.com',
  password: 'TestPassword123!',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User'
};

// Variables globales para almacenar datos entre tests
let authToken = '';
let userId = '';
let eventId = '';
let tribeId = '';
let chatId = '';
let notificationId = '';

// Colores para console.log
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Función helper para logging
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

// Tests de autenticación
async function testAuthentication() {
  log('\n🔐 TESTING AUTHENTICATION', 'bold');
  
  // Test 1: Health Check
  logInfo('Testing Health Check...');
  const health = await makeRequest('GET', '/health');
  if (health.success) {
    logSuccess('Health Check passed');
  } else {
    logError('Health Check failed');
    return false;
  }

  // Test 2: Register User
  logInfo('Testing User Registration...');
  const register = await makeRequest('POST', '/api/auth/register', {
    username: TEST_USER.username,
    email: TEST_USER.email,
    password: TEST_USER.password,
    firstName: TEST_USER.firstName,
    lastName: TEST_USER.lastName
  });

  if (register.success) {
    logSuccess('User Registration passed');
    authToken = register.data.token;
    userId = register.data.user.id;
  } else {
    logWarning('User already exists, trying login...');
  }

  // Test 3: Login User
  logInfo('Testing User Login...');
  const login = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (login.success) {
    logSuccess('User Login passed');
    authToken = login.data.token;
    userId = login.data.user.id;
  } else {
    logError('User Login failed');
    return false;
  }

  // Test 4: Get Current User
  logInfo('Testing Get Current User...');
  const currentUser = await makeRequest('GET', '/api/auth/me', null, {
    'Authorization': `Bearer ${authToken}`
  });

  if (currentUser.success) {
    logSuccess('Get Current User passed');
  } else {
    logError('Get Current User failed');
    return false;
  }

  return true;
}

// Tests de eventos
async function testEvents() {
  log('\n📅 TESTING EVENTS API', 'bold');

  // Test 1: Get All Events
  logInfo('Testing Get All Events...');
  const getEvents = await makeRequest('GET', '/api/events');
  if (getEvents.success) {
    logSuccess('Get All Events passed');
  } else {
    logError('Get All Events failed');
  }

  // Test 2: Get Nearby Events
  logInfo('Testing Get Nearby Events...');
  const nearbyEvents = await makeRequest('GET', '/api/events/nearby?lat=40.7128&lng=-74.0060&radius=50');
  if (nearbyEvents.success) {
    logSuccess('Get Nearby Events passed');
  } else {
    logError('Get Nearby Events failed');
  }

  // Test 3: Create Event
  logInfo('Testing Create Event...');
  const createEvent = await makeRequest('POST', '/api/events', {
    title: 'Evento de Prueba Automatizado',
    description: 'Evento creado por script de testing',
    category: 'technology',
    date: '2024-03-01T18:00:00.000Z',
    endDate: '2024-03-01T20:00:00.000Z',
    location: {
      coordinates: [-74.0060, 40.7128],
      address: 'Calle Principal 123, Nueva York, NY',
      venue: 'Lugar del evento'
    },
    maxAttendees: 100,
    price: {
      amount: 25.00,
      currency: 'USD'
    },
    isPrivate: false,
    tags: ['technology', 'networking']
  }, {
    'Authorization': `Bearer ${authToken}`
  });

  if (createEvent.success) {
    logSuccess('Create Event passed');
    eventId = createEvent.data.event.id;
  } else {
    logError('Create Event failed');
  }

  // Test 4: Get Event by ID
  if (eventId) {
    logInfo('Testing Get Event by ID...');
    const getEvent = await makeRequest('GET', `/api/events/${eventId}`);
    if (getEvent.success) {
      logSuccess('Get Event by ID passed');
    } else {
      logError('Get Event by ID failed');
    }
  }
}

// Tests de tribus
async function testTribes() {
  log('\n👥 TESTING TRIBES API', 'bold');

  // Test 1: Get All Tribes
  logInfo('Testing Get All Tribes...');
  const getTribes = await makeRequest('GET', '/api/tribes');
  if (getTribes.success) {
    logSuccess('Get All Tribes passed');
  } else {
    logError('Get All Tribes failed');
  }

  // Test 2: Create Tribe
  logInfo('Testing Create Tribe...');
  const createTribe = await makeRequest('POST', '/api/tribes', {
    name: 'Tribu de Testing Automatizado',
    description: 'Tribu creada por script de testing',
    category: 'technology',
    isPrivate: false,
    tags: ['tech', 'testing', 'automation']
  }, {
    'Authorization': `Bearer ${authToken}`
  });

  if (createTribe.success) {
    logSuccess('Create Tribe passed');
    tribeId = createTribe.data.tribe.id;
  } else {
    logError('Create Tribe failed');
  }

  // Test 3: Get Tribe by ID
  if (tribeId) {
    logInfo('Testing Get Tribe by ID...');
    const getTribe = await makeRequest('GET', `/api/tribes/${tribeId}`);
    if (getTribe.success) {
      logSuccess('Get Tribe by ID passed');
    } else {
      logError('Get Tribe by ID failed');
    }
  }
}

// Tests de gamificación
async function testGamification() {
  log('\n🎮 TESTING GAMIFICATION', 'bold');

  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get User Profile Stats
  logInfo('Testing Get User Profile Stats...');
  const profile = await makeRequest('GET', '/api/gamification/profile', null, headers);
  if (profile.success) {
    logSuccess('Get User Profile Stats passed');
  } else {
    logError('Get User Profile Stats failed');
  }

  // Test 2: Get Achievements
  logInfo('Testing Get Achievements...');
  const achievements = await makeRequest('GET', '/api/gamification/achievements', null, headers);
  if (achievements.success) {
    logSuccess('Get Achievements passed');
  } else {
    logError('Get Achievements failed');
  }

  // Test 3: Get Available Achievements
  logInfo('Testing Get Available Achievements...');
  const availableAchievements = await makeRequest('GET', '/api/gamification/achievements/available', null, headers);
  if (availableAchievements.success) {
    logSuccess('Get Available Achievements passed');
  } else {
    logError('Get Available Achievements failed');
  }

  // Test 4: Get Leaderboards
  logInfo('Testing Get Leaderboards...');
  const leaderboards = await makeRequest('GET', '/api/gamification/leaderboards', null, headers);
  if (leaderboards.success) {
    logSuccess('Get Leaderboards passed');
  } else {
    logError('Get Leaderboards failed');
  }

  // Test 5: Get Challenges
  logInfo('Testing Get Challenges...');
  const challenges = await makeRequest('GET', '/api/gamification/challenges', null, headers);
  if (challenges.success) {
    logSuccess('Get Challenges passed');
  } else {
    logError('Get Challenges failed');
  }

  // Test 6: Track Action
  logInfo('Testing Track Action...');
  const trackAction = await makeRequest('POST', '/api/gamification/track-action', {
    action: 'event_created',
    metadata: {
      eventId: eventId,
      eventType: 'technology'
    }
  }, headers);
  if (trackAction.success) {
    logSuccess('Track Action passed');
  } else {
    logError('Track Action failed');
  }

  // Test 7: Get Gamification Stats
  logInfo('Testing Get Gamification Stats...');
  const stats = await makeRequest('GET', '/api/gamification/stats', null, headers);
  if (stats.success) {
    logSuccess('Get Gamification Stats passed');
  } else {
    logError('Get Gamification Stats failed');
  }
}

// Tests de notificaciones
async function testNotifications() {
  log('\n🔔 TESTING NOTIFICATIONS', 'bold');

  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get User Notifications
  logInfo('Testing Get User Notifications...');
  const notifications = await makeRequest('GET', '/api/notifications', null, headers);
  if (notifications.success) {
    logSuccess('Get User Notifications passed');
    if (notifications.data.data && notifications.data.data.length > 0) {
      notificationId = notifications.data.data[0].id;
    }
  } else {
    logError('Get User Notifications failed');
  }

  // Test 2: Get Unread Count
  logInfo('Testing Get Unread Count...');
  const unreadCount = await makeRequest('GET', '/api/notifications/unread-count', null, headers);
  if (unreadCount.success) {
    logSuccess('Get Unread Count passed');
  } else {
    logError('Get Unread Count failed');
  }

  // Test 3: Get Notification Stats
  logInfo('Testing Get Notification Stats...');
  const notificationStats = await makeRequest('GET', '/api/notifications/stats', null, headers);
  if (notificationStats.success) {
    logSuccess('Get Notification Stats passed');
  } else {
    logError('Get Notification Stats failed');
  }

  // Test 4: Mark All as Read
  logInfo('Testing Mark All as Read...');
  const markAllRead = await makeRequest('PUT', '/api/notifications/read-all', null, headers);
  if (markAllRead.success) {
    logSuccess('Mark All as Read passed');
  } else {
    logError('Mark All as Read failed');
  }
}

// Tests de AI Recommendations
async function testAIRecommendations() {
  log('\n🤖 TESTING AI RECOMMENDATIONS', 'bold');

  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get Event Recommendations
  logInfo('Testing Get Event Recommendations...');
  const eventRecommendations = await makeRequest('GET', '/api/ai/recommendations/events', null, headers);
  if (eventRecommendations.success) {
    logSuccess('Get Event Recommendations passed');
  } else {
    logError('Get Event Recommendations failed');
  }

  // Test 2: Get Tribe Recommendations
  logInfo('Testing Get Tribe Recommendations...');
  const tribeRecommendations = await makeRequest('GET', '/api/ai/recommendations/tribes', null, headers);
  if (tribeRecommendations.success) {
    logSuccess('Get Tribe Recommendations passed');
  } else {
    logError('Get Tribe Recommendations failed');
  }

  // Test 3: Get Trending Content
  logInfo('Testing Get Trending Content...');
  const trending = await makeRequest('GET', '/api/ai/trending', null, headers);
  if (trending.success) {
    logSuccess('Get Trending Content passed');
  } else {
    logError('Get Trending Content failed');
  }
}

// Tests de usuarios
async function testUsers() {
  log('\n👤 TESTING USERS API', 'bold');

  const headers = { 'Authorization': `Bearer ${authToken}` };

  // Test 1: Get User Profile
  logInfo('Testing Get User Profile...');
  const profile = await makeRequest('GET', '/api/users/profile', null, headers);
  if (profile.success) {
    logSuccess('Get User Profile passed');
  } else {
    logError('Get User Profile failed');
  }

  // Test 2: Update Profile
  logInfo('Testing Update Profile...');
  const updateProfile = await makeRequest('PUT', '/api/users/profile', {
    firstName: 'Test Updated',
    lastName: 'User Updated',
    bio: 'Perfil actualizado por script de testing',
    interests: ['tecnología', 'testing', 'automation'],
    location: {
      city: 'Nueva York',
      country: 'Estados Unidos'
    }
  }, headers);
  if (updateProfile.success) {
    logSuccess('Update Profile passed');
  } else {
    logError('Update Profile failed');
  }

  // Test 3: Get All Users
  logInfo('Testing Get All Users...');
  const allUsers = await makeRequest('GET', '/api/users', null, headers);
  if (allUsers.success) {
    logSuccess('Get All Users passed');
  } else {
    logError('Get All Users failed');
  }
}

// Función principal
async function runAllTests() {
  log('\n🚀 STARTING COMPREHENSIVE API TESTING', 'bold');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`Test User: ${TEST_USER.email}`, 'blue');

  try {
    // Test Authentication
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      logError('Authentication failed. Stopping tests.');
      return;
    }

    // Test Events
    await testEvents();

    // Test Tribes
    await testTribes();

    // Test Gamification
    await testGamification();

    // Test Notifications
    await testNotifications();

    // Test AI Recommendations
    await testAIRecommendations();

    // Test Users
    await testUsers();

    log('\n🎉 ALL TESTS COMPLETED!', 'bold');
    log('📊 Summary:', 'blue');
    log(`- User ID: ${userId}`, 'blue');
    log(`- Event ID: ${eventId}`, 'blue');
    log(`- Tribe ID: ${tribeId}`, 'blue');
    log(`- Chat ID: ${chatId}`, 'blue');
    log(`- Notification ID: ${notificationId}`, 'blue');

  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
  }
}

// Ejecutar tests si el script se ejecuta directamente
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testAuthentication,
  testEvents,
  testTribes,
  testGamification,
  testNotifications,
  testAIRecommendations,
  testUsers
};
