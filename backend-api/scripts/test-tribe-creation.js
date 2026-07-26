const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testTribeCreation() {
    try {
        // 1. Register/Login to get token
        const user = {
            username: `tribetester_${Date.now()}`,
            email: `tribe${Date.now()}@test.com`,
            password: 'Password123!'
        };

        console.log('Registering user...');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            ...user,
            firstName: 'Tribe',
            lastName: 'Tester',
            birthDate: '1990-01-01',
            acceptTerms: true
        });

        const token = regRes.data.accessToken;
        console.log('User registered. Token:', token ? 'Recieved' : 'Missing');

        // 2. Create Tribe with invalid data
        const tribeData = {
            name: `Test Tribe ${Date.now()}`,
            description: 'A test tribe for debugging',
            category: 'INVALID_CATEGORY', // This should trigger a validation error
            isPublic: true,
            tags: ['debug', 'test']
        };

        console.log('Creating tribe with INVALID category...', tribeData);
        const tribeRes = await axios.post(`${API_URL}/tribes`, tribeData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Tribe created (unexpected):', tribeRes.data);

    } catch (error) {
        // console.log('Debug Error Response:', error.response ? error.response.data : error.message);

        if (error.response && error.response.status === 400) {
            console.log('✅ Success: Received expected 400 Bad Request for invalid data.');
            console.log('   Message:', error.response.data.message);
        } else if (error.response && error.response.status === 500) {
            console.log('❌ Failed: Still receiving 500 Server Error.');
        } else {
            console.error('❌ Error:', error.response ? error.response.data : error.message);
        }
    }
}

testTribeCreation();
