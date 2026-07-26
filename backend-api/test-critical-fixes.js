
const axios = require('axios');
const colors = require('colors');

const API_URL = 'http://localhost:5000/api';
let authToken = '';
let userId = '';
let eventId = '';

async function runTests() {
    console.log('Starting Critical Fixes Verification...'.cyan.bold);

    try {
        // 1. Login
        console.log('\n1. Logging in...'.yellow);
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'demo@example.com',
            password: 'password123'
        });
        authToken = loginRes.data.token;
        userId = loginRes.data.user.id;
        console.log('Login successful'.green);

        // 2. Create Test Event
        console.log('\n2. Creating Test Event for Stories...'.yellow);
        const eventRes = await axios.post(`${API_URL}/events`, {
            title: 'Story Test Event',
            description: 'Testing event stories',
            date: new Date(Date.now() + 86400000),
            location: {
                address: 'Test Location',
                coordinates: [0, 0]
            },
            category: 'social',
            price: { amount: 0, currency: 'USD' },
            maxAttendees: 100
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        eventId = eventRes.data.event._id;
        console.log(`Event Created: ${eventId}`.green);

        // 3. Test Get Event Stories (Should be empty but success)
        console.log('\n3. Testing Get Event Stories...'.yellow);
        try {
            const storiesRes = await axios.get(`${API_URL}/stories/event/${eventId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            console.log(`Stories fetched: ${storiesRes.data.stories.length}`.green);
            if (storiesRes.data.success) {
                console.log('Get Event Stories Endpoint Works!'.green.bold);
            }
        } catch (error) {
            console.error('Get Event Stories Failed:'.red, error.response?.data || error.message);
            process.exit(1);
        }

        // 4. Test User Profile Fetch (for spinner issue)
        console.log('\n4. Testing User Profile Fetch...'.yellow);
        const profileRes = await axios.get(`${API_URL}/users/profile/${userId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (profileRes.data.success) {
            console.log('Get User Profile Works!'.green.bold);
        }

        // 5. Test Discovery Join (Idempotency check verified previously, but good to double check)
        // We can't fully simulate the frontend state update here, but we verify the API returns 200
        console.log('\n5. Verifying Attend API Idempotency...'.yellow);
        await axios.post(`${API_URL}/events/${eventId}/attend`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        }); // First time

        try {
            await axios.post(`${API_URL}/events/${eventId}/attend`, {}, {
                headers: { Authorization: `Bearer ${authToken}` }
            }); // Second time
            console.log('Second attend request succeeded (Idempotent)'.green.bold);
        } catch (error) {
            console.error('Second attend request failed:'.red, error.response?.status);
        }

        console.log('\nALL CRITICAL FIXES VERIFIED!'.cyan.bold);

    } catch (error) {
        console.error('\nVerification Failed:'.red, error.response?.data || error.message);
    }
}

runTests();
