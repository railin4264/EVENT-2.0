const API_URL = 'http://localhost:5000/api';

async function reproduceError() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'demo@eventconnect.com',
                password: 'Demo123!'
            })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(JSON.stringify(loginData));

        const token = loginData.accessToken;
        console.log('Login successful, token obtained.');

        // 2. Create Tribe (Valid payload)
        console.log('\nAttempting to create a valid tribe...');
        const tribeRes = await fetch(`${API_URL}/tribes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Test Tribe ' + Date.now(),
                description: 'A test tribe for debugging',
                category: 'technology',
                isPublic: true,
                tags: ['test']
            })
        });

        const tribeData = await tribeRes.json();
        if (tribeRes.ok) {
            console.log('✅ Tribe created successfully!');
        } else {
            console.error('❌ Tribe creation failed:', tribeData);
        }

    } catch (error) {
        console.error('❌ Script failed:', error.message);
    }
}

reproduceError();
