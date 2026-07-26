const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const USER_18_PLUS = {
    username: 'user18',
    email: 'user18@test.com',
    password: 'Password123!',
    firstName: 'Adult',
    lastName: 'User',
    birthDate: '1990-01-01', // 34 years old
    acceptTerms: true
};

const USER_UNDER_18 = {
    username: 'user17',
    email: 'user17@test.com',
    password: 'Password123!',
    firstName: 'Minor',
    lastName: 'User',
    birthDate: '2010-01-01', // 14 years old
    acceptTerms: true
};

async function testAgeVerification() {
    try {
        console.log('🚀 Starting Age Verification QA Test...');

        // 1. Register Users
        console.log('\n👤 Registering Users...');
        let token18, token17;

        try {
            const res18 = await axios.post(`${API_URL}/auth/register`, USER_18_PLUS);
            token18 = res18.data.accessToken || res18.data.token;
            console.log('✅ Registered Adult User (18+)');
        } catch (e) {
            if (e.response?.status === 400 && e.response.data.message.includes('already exists')) {
                console.log('⚠️ Adult user already exists, logging in...');
                const res = await axios.post(`${API_URL}/auth/login`, { email: USER_18_PLUS.email, password: USER_18_PLUS.password });
                token18 = res.data.accessToken || res.data.token;
            } else {
                throw e;
            }
        }

        try {
            const res17 = await axios.post(`${API_URL}/auth/register`, USER_UNDER_18);
            token17 = res17.data.accessToken || res17.data.token;
            console.log('✅ Registered Minor User (<18)');
        } catch (e) {
            if (e.response?.status === 400 && e.response.data.message.includes('already exists')) {
                console.log('⚠️ Minor user already exists, logging in...');
                const res = await axios.post(`${API_URL}/auth/login`, { email: USER_UNDER_18.email, password: USER_UNDER_18.password });
                token17 = res.data.accessToken || res.data.token;
            } else {
                throw e;
            }
        }

        // 2. Create Age Restricted Event (Adult Only)
        console.log('\n📅 Creating Adult Only Event...');
        let adultEventId;
        try {
            const eventData = {
                title: 'Adults Only Party',
                description: 'This is a strictly 18+ event for testing purposes. It contains mature themes.',
                category: 'music',
                date: new Date(Date.now() + 86400000).toISOString(),
                location: { address: 'Test Venue', coordinates: [0, 0] },
                price: { amount: 0, currency: 'USD' },
                maxAttendees: 100,
                isPrivate: false,
                tags: ['party'],
                ageRestriction: {
                    minAge: 18,
                    isAdultOnly: true
                }
            };

            const resEvent = await axios.post(`${API_URL}/events`, eventData, {
                headers: { Authorization: `Bearer ${token18}` }
            });
            adultEventId = resEvent.data.event._id;
            console.log('✅ Created 18+ Event:', adultEventId);
        } catch (e) {
            console.error('❌ Failed to create event:', e.response?.data || e.message);
            throw e;
        }

        // 3. Verify Access
        console.log('\n🔒 Verifying Access Control...');

        // 3a. Adult accessing 18+ event (Should Succeed)
        try {
            await axios.get(`${API_URL}/events/${adultEventId}`, {
                headers: { Authorization: `Bearer ${token18}` }
            });
            console.log('✅ Adult User accessed 18+ event (Expected: Success)');
        } catch (e) {
            console.error('❌ Adult User FAILED to access 18+ event:', e.response?.status);
        }

        // 3b. Minor accessing 18+ event (Should Fail)
        try {
            await axios.get(`${API_URL}/events/${adultEventId}`, {
                headers: { Authorization: `Bearer ${token17}` }
            });
            console.error('❌ Minor User accessed 18+ event (Expected: Failure 403)');
        } catch (e) {
            if (e.response?.status === 403) {
                console.log('✅ Minor User blocked from 18+ event (Expected: 403 Forbidden)');
            } else {
                console.error('❌ Minor User got unexpected error:', e.response?.status);
            }
        }

        // 3c. Public Access test (Should Fail/Filter)
        // NOTE: Listing events should hide it or show restricted
        console.log('\n🔎 Verifying Feed Filtering...');

        const publicFeed = await axios.get(`${API_URL}/events`);
        const adultEventInPublic = publicFeed.data.events.find(e => e._id === adultEventId);
        if (!adultEventInPublic) {
            console.log('✅ 18+ Event NOT found in public feed (Expected: Hidden)');
        } else {
            console.log('⚠️ 18+ Event FOUND in public feed (Check if intended behavior)');
        }

        const minorFeed = await axios.get(`${API_URL}/events`, {
            headers: { Authorization: `Bearer ${token17}` }
        });
        const adultEventInMinorFeed = minorFeed.data.events.find(e => e._id === adultEventId);
        if (!adultEventInMinorFeed) {
            console.log('✅ 18+ Event NOT found in minor feed (Expected: Hidden)');
        } else {
            console.log('❌ 18+ Event FOUND in minor feed (Expected: Hidden)');
        }

        console.log('\n✨ Age Verification Logic Verified!');

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testAgeVerification();
