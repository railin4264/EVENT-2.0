const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function runTest() {
    try {
        // 1. Login as demo user
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'demo@eventconnect.com',
            password: 'Password123!'
        });
        const token = loginRes.data.accessToken;
        console.log('✅ Logged in as demo user');

        // 2. Create Story with Content Only
        try {
            const form = new FormData();
            form.append('content', 'Hello World Story');

            const res = await axios.post(`${API_URL}/stories`, form, {
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('✅ Created text story:', res.data.success);
        } catch (e) {
            console.error('❌ Text story failed:', e.response?.data);
        }

        // 3. Create Story with Media (Mocking a file)
        try {
            const form = new FormData();
            // Create a dummy file
            const dummyPath = path.join(__dirname, 'test-image.jpg');
            fs.writeFileSync(dummyPath, 'fake image content');

            form.append('media', fs.createReadStream(dummyPath));
            form.append('content', 'Story with Image');

            const res = await axios.post(`${API_URL}/stories`, form, {
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('✅ Created media story:', res.data.success);

            // cleanup
            fs.unlinkSync(dummyPath);
        } catch (e) {
            console.error('❌ Media story failed:', e.response?.data);
        }

    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

runTest();
