const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';
let userId = '';

const printSection = (title) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing: ${title}`);
    console.log('='.repeat(50));
};

const run = async () => {
    try {
        // 1. Login
        printSection('Authentication');
        console.log('Logging in as admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@eventconnect.com',
            password: 'AdminPass123!'
        });
        token = loginRes.data.accessToken;
        userId = loginRes.data.user.id;
        console.log('✅ Login successful');

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Profile
        printSection('User Profile');
        console.log('Fetching profile...');
        const profileRes = await axios.get(`${API_URL}/users/me`, { headers });
        console.log('✅ Fetch Profile OK');

        console.log('Updating bio...');
        const newBio = `Admin user testing features at ${new Date().toISOString()}`;
        const updateProfileRes = await axios.put(`${API_URL}/users/profile`, { bio: newBio }, { headers });
        if (updateProfileRes.data.user.bio === newBio) {
            console.log('✅ Update Profile OK');
        } else {
            console.error('❌ Update Profile Failed: Bio mismatch');
        }

        // 3. Settings
        printSection('User Settings');
        console.log('Fetching settings...');
        const settingsRes = await axios.get(`${API_URL}/users/me/settings`, { headers });
        console.log('✅ Fetch Settings OK');

        console.log('Updating notification settings...');
        const currentEmailSetting = settingsRes.data.settings.notifications?.email ?? true;
        const newEmailSetting = !currentEmailSetting;

        const updateSettingsRes = await axios.put(`${API_URL}/users/me/settings`, {
            notifications: { email: newEmailSetting }
        }, { headers });

        if (updateSettingsRes.data.settings.notifications.email === newEmailSetting) {
            console.log('✅ Update Settings OK');
        } else {
            console.error('❌ Update Settings Failed');
        }

        // 4. Notifications
        printSection('Notifications');
        console.log('Creating test notifications...');
        await axios.post(`${API_URL}/notifications/test`, {}, { headers });
        console.log('✅ Create Test Notifications OK');

        console.log('Fetching notifications...');
        const notifRes = await axios.get(`${API_URL}/notifications`, { headers });
        const notifications = notifRes.data.data.notifications;
        console.log(`Found ${notifications.length} notifications`);

        if (notifications.length > 0) {
            const firstNotifId = notifications[0]._id;
            console.log(`Marking notification ${firstNotifId} as read...`);
            await axios.post(`${API_URL}/notifications/${firstNotifId}/read`, {}, { headers });
            console.log('✅ Mark Read OK');
        }

        console.log('Checking unread count...');
        const countRes = await axios.get(`${API_URL}/notifications/unread-count`, { headers });
        console.log(`Unread count: ${countRes.data.data.unreadCount}`);
        console.log('✅ Unread Count OK');

        // 6. Feed & Posts
        printSection('Feed & Posts');
        console.log('Creating a public post...');
        const postRes = await axios.post(`${API_URL}/feed`, {
            content: 'This is a test post for AI feed verification',
            visibility: 'public'
        }, { headers });
        console.log('✅ Create Post OK');

        // 5. AI Recommendations (Moved after post creation)
        printSection('AI Recommendations');
        console.log('Fetching all recommendations...');
        try {
            const aiRes = await axios.get(`${API_URL}/ai/recommendations?limit=5`, { headers });
            console.log(`✅ AI Recommendations OK`);
            console.log(`   - Events: ${aiRes.data.data.events?.length || 0}`);
            console.log(`   - Tribes: ${aiRes.data.data.tribes?.length || 0}`);
            console.log(`   - Users: ${aiRes.data.data.users?.length || 0}`);
        } catch (e) {
            console.error('❌ AI Recommendations Failed', e.response?.data || e.message);
        }

        console.log('\nFetching Curated Feed...');
        try {
            const feedRes = await axios.get(`${API_URL}/ai/feed?limit=5`, { headers });
            console.log(`✅ Curated Feed OK (${feedRes.data.count} items)`);
        } catch (e) {
            console.error('❌ Curated Feed Failed', e.response?.data || e.message);
        }

        console.log('\nFetching Trending Content...');
        try {
            const trendingRes = await axios.get(`${API_URL}/ai/trending?limit=5`, { headers });
            console.log(`✅ Trending Content OK (${trendingRes.data.count} items)`);
        } catch (e) {
            // Trending is public, but let's check it anyway
            console.error('❌ Trending Content Failed', e.response?.data || e.message);
        }

    } catch (error) {
        console.error('\n❌ FATAL ERROR TEST FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received:', error.message);
        } else {
            console.error('Error setting up request:', error.message);
        }
        console.error('Config:', JSON.stringify(error.config, null, 2));
    }
};

run();
