const axios = require('axios');
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker'); // Ensure faker is available or use simple random generation

// Base Configuration
const API_URL = 'http://localhost:5000/api';
let authToken = '';
let userId = '';
let eventId = '';
let commentId = '';

// Helper for colored logs
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

// Helper to handle API requests
async function request(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            data,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        };
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response ? error.response.data : error.message,
            status: error.response ? error.response.status : 500
        };
    }
}

async function runHealthCheck() {
    log('\n🚀 Starting System Health Check...\n', colors.blue);

    // 1. Authentication Flow
    log('1️⃣  Testing Authentication...', colors.yellow);

    const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        birthDate: '1990-01-01',
        interests: ['technology', 'music'],
        acceptTerms: true
    };

    // Register
    const registerRes = await request('POST', '/auth/register', testUser);
    if (registerRes.success) {
        log('   ✅ Register success', colors.green);
        authToken = registerRes.data.accessToken;
    } else {
        log(`   ❌ Register failed: ${JSON.stringify(registerRes.error)}`, colors.red);
        return;
    }

    // Login
    const loginRes = await request('POST', '/auth/login', {
        email: testUser.email,
        password: testUser.password
    });
    if (loginRes.success) {
        log('   ✅ Login success', colors.green);
        authToken = loginRes.data.accessToken; // Update token just in case
        userId = loginRes.data.user ? (loginRes.data.user.id || loginRes.data.user._id) : 'unknown';
    } else {
        log(`   ❌ Login failed: ${JSON.stringify(loginRes.error)}`, colors.red);
        return;
    }

    // Get Me
    const meRes = await request('GET', '/auth/me', null, authToken);
    if (meRes.success) {
        log('   ✅ Get Current User success', colors.green);
        userId = meRes.data.user._id; // Corrected structure
    } else {
        log(`   ❌ Get Me failed: ${JSON.stringify(meRes.error)}`, colors.red);
    }

    // 2. Events Flow
    log('\n2️⃣  Testing Events...', colors.yellow);

    const newEvent = {
        title: 'Health Check Event',
        description: 'This is a test event for system health check',
        category: 'technology',
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        location: {
            type: 'Point',
            coordinates: [-69.9312, 18.4861], // Santo Domingo approx
            address: 'Santo Domingo, DR'
        },
        maxAttendees: 100,
        price: { amount: 0, currency: 'USD' },
        ageRestriction: { minAge: 18, isAdultOnly: false },
        tags: ['test', 'healthcheck']
    };

    // Create Event
    const createEventRes = await request('POST', '/events', newEvent, authToken);
    if (createEventRes.success) {
        log('   ✅ Create Event success', colors.green);
        eventId = createEventRes.data.event._id;
    } else {
        log(`   ❌ Create Event failed: ${JSON.stringify(createEventRes.error)}`, colors.red);
    }

    // Get Events (Discovery)
    const getEventsRes = await request('GET', '/events?limit=5');
    if (getEventsRes.success && getEventsRes.data.count > 0) {
        log('   ✅ Get Events (Discovery) success', colors.green);
    } else {
        log(`   ❌ Get Events failed or empty: ${JSON.stringify(getEventsRes.error)}`, colors.red);
    }

    // Get Single Event
    if (eventId) {
        const getEventRes = await request('GET', `/events/${eventId}`, null, authToken);
        if (getEventRes.success) {
            log('   ✅ Get Single Event success', colors.green);
        } else {
            log(`   ❌ Get Single Event failed: ${JSON.stringify(getEventRes.error)}`, colors.red);
        }
    }

    // Search Events
    const searchRes = await request('GET', '/events/search?query=Health');
    if (searchRes.success) {
        log('   ✅ Search Events success', colors.green);
    } else {
        log(`   ❌ Search Events failed: ${JSON.stringify(searchRes.error)}`, colors.red);
    }

    // 3. Social Interactions
    log('\n3️⃣  Testing Social Interactions...', colors.yellow);

    if (eventId) {
        // Attend Event (Creator cannot attend own event usually, so lets try anyway and expect specific behavior or create another user. 
        // For simplicity, we'll try to comment first which is allowed)

        // Add Comment
        const commentRes = await request('POST', `/events/${eventId}/comments`, { comment: 'Test comment' }, authToken);
        if (commentRes.success) {
            log('   ✅ Add Comment success', colors.green);
            commentId = commentRes.data.comment ? commentRes.data.comment._id : null;
        } else {
            log(`   ❌ Add Comment failed: ${JSON.stringify(commentRes.error)}`, colors.red);
        }

        // Get Comments
        const getCommentsRes = await request('GET', `/events/${eventId}/comments`);
        if (getCommentsRes.success) {
            log('   ✅ Get Comments success', colors.green);
        } else {
            log(`   ❌ Get Comments failed: ${JSON.stringify(getCommentsRes.error)}`, colors.red);
        }
    }

    // 4. User Profile
    log('\n4️⃣  Testing User Profile...', colors.yellow);

    const updateProfileRes = await request('PUT', '/users/profile', { bio: 'Updated bio for health check' }, authToken);
    if (updateProfileRes.success) {
        log('   ✅ Update Profile success', colors.green);
    } else {
        log(`   ❌ Update Profile failed: ${JSON.stringify(updateProfileRes.error)}`, colors.red);
    }

    log('\n✨ Health Check Complete!', colors.blue);
}

runHealthCheck();
