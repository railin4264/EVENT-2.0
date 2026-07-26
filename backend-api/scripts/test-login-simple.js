const axios = require('axios');

const login = async () => {
    try {
        console.log('Attempting login with admin@eventconnect.com...');
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@eventconnect.com',
            password: 'AdminPass123!'
        });
        console.log('Login successful!');
        console.log('Token received:', res.data.accessToken ? 'YES' : 'NO');
    } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

login();
