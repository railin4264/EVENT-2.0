const axios = require('axios');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const API_URL = 'http://localhost:5000/api';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

const log = (msg, type = 'blue') => console.log(`${colors[type]}%s${colors.reset}`, msg);

async function testStories() {
    log('Starting Stories Route Test...', 'blue');

    // 1. Create a dummy event ID (valid format)
    const eventId = new ObjectId().toString();
    log(`Testing with Event ID: ${eventId}`);

    try {
        // Test 1: Public access (no token)
        log('\n1. Testing GET /stories/event/:id without token (Public Access)...');
        try {
            const res = await axios.get(`${API_URL}/stories/event/${eventId}`);
            if (res.status === 200) {
                log('✅ Success: Public access allowed', 'green');
                log(`Response: ${JSON.stringify(res.data).substring(0, 100)}...`);
            } else {
                log(`❌ Failed: Status ${res.status}`, 'red');
            }
        } catch (err) {
            if (err.response) {
                log(`❌ Failed: Status ${err.response.status} - ${err.response.data.message}`, 'red');
            } else {
                log(`❌ Error: ${err.message}`, 'red');
            }
        }

    } catch (error) {
        log(`❌ Unexpected Error: ${error.message}`, 'red');
    }
}

// Run test
testStories();
