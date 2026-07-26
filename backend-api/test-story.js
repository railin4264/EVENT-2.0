const axios = require('axios');
const fs = require('fs');
async function test() {
    let log = '';
    try {
        const login = await axios.post('http://localhost:5000/api/auth/login', { email: 'test@eventconnect.com', password: 'Test123!@#' });
        const token = login.data.accessToken;

        log += 'Got token, creating story...\n';
        try {
            const res = await axios.post('http://localhost:5000/api/stories', {
                content: 'This is a test story'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            log += 'Story created successfully: ' + res.data.message + '\n';
        } catch (err) {
            log += 'Story creation failed: ' + JSON.stringify(err.response ? err.response.data : err.message) + '\n';
        }

        log += 'Creating tribe with valid category...\n';
        try {
            const resTribe = await axios.post('http://localhost:5000/api/tribes', {
                name: 'Test Tribe ' + Date.now(),
                description: 'Test Description',
                category: 'technology'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            log += 'Tribe created successfully: ' + resTribe.data.message + '\n';
        } catch (err) {
            log += 'Tribe creation failed: ' + JSON.stringify(err.response ? err.response.data : err.message) + '\n';
        }

    } catch (err) {
        if (err.response) {
            log += 'Login error: ' + JSON.stringify(err.response.data) + '\n';
        } else {
            log += 'Error: ' + err.message + '\n';
        }
    }
    fs.writeFileSync('test-result.txt', log, 'utf8');
}
test();
