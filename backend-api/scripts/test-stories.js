const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Configuration
const API_URL = 'http://localhost:5000/api';
const AUTH_URL = 'http://localhost:5000/api/auth';
let adminToken = '';
let adminId = '';

// Utils
const log = (msg, type = 'info') => {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`${icons[type]} ${msg}`);
};

const login = async () => {
    const email = `tester${Date.now()}@test.com`;
    const password = 'Password@123';

    try {
        // Try registering first
        const res = await axios.post(`${AUTH_URL}/register`, {
            username: `storytester${Date.now()}`,
            email,
            password,
            firstName: 'Story',
            lastName: 'Tester',
            acceptTerms: true,
            birthDate: '2000-01-01'
        });
        adminToken = res.data.accessToken;
        adminId = res.data.user.id;
        log(`Registered new user: ${email}`, 'success');
    } catch (regError) {
        log(`Registration failed: ${regError.message}`, 'warning');
        if (regError.response) console.log(JSON.stringify(regError.response.data, null, 2));
        // Try login if register failed
        try {
            const res = await axios.post(`${AUTH_URL}/login`, { email, password });
            adminToken = res.data.accessToken;
            adminId = res.data.user.id;
            log('Logged in', 'success');
        } catch (err) {
            log(`Login also failed: ${err.message}`, 'error');
            process.exit(1);
        }
    }
};

const testUserStories = async () => {
    log('--- Testing User Stories ---');
    try {
        // Create Story with FormData
        const form = new FormData();
        form.append('content', 'This is a test user story with media');
        form.append('location', JSON.stringify({
            type: 'Point',
            coordinates: [-73.935242, 40.730610],
            address: 'New York, NY'
        }));

        // Add a dummy file (we need to create one or use a buffer)
        form.append('media', Buffer.from('fake image content'), {
            filename: 'test-image.jpg',
            contentType: 'image/jpeg'
        });

        const createRes = await axios.post(`${API_URL}/stories`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${adminToken}`
            }
        });

        log(`User Story Created: ${createRes.data.data._id}`, 'success');
        const storyId = createRes.data.data._id;

        // Get Feed
        const feedRes = await axios.get(`${API_URL}/stories/feed`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const found = feedRes.data.stories.find(s => s._id === storyId);
        if (found) {
            log('Story found in feed', 'success');
        } else {
            log('Story NOT found in feed', 'error');
        }

        // Like Story
        await axios.post(`${API_URL}/stories/${storyId}/like`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        log('Story liked', 'success');

        // Create Story with Poll
        const pollForm = new FormData();
        pollForm.append('content', 'Poll Story');
        pollForm.append('poll', JSON.stringify({
            question: 'Best framework?',
            options: [{ text: 'React' }, { text: 'Vue' }]
        }));

        const pollRes = await axios.post(`${API_URL}/stories`, pollForm, {
            headers: {
                ...pollForm.getHeaders(),
                Authorization: `Bearer ${adminToken}`
            }
        });
        log(`Poll Story Created: ${pollRes.data.data._id}`, 'success');
        const pollStoryId = pollRes.data.data._id;

        if (pollRes.data.data.poll) {
            log('Poll data present in response', 'success');
        } else {
            log('Poll data MISSING in response', 'error');
        }

        // Vote on Poll
        await axios.post(`${API_URL}/stories/${pollStoryId}/poll/vote`, { optionIndex: 0 }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        log('Voted on poll', 'success');

        // Verify vote
        const feedRes2 = await axios.get(`${API_URL}/stories/feed`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const pollStory = feedRes2.data.stories.find(s => s._id === pollStoryId);
        if (pollStory) {
            const hasVoted = pollStory.poll.options[0].votes.some(v => v.toString() === adminId);
            if (hasVoted) {
                log('Vote verified in feed', 'success');
            } else {
                log('Vote verification FAILED', 'error');
            }
        } else {
            log('Poll Story NOT found in feed', 'error');
        }

    } catch (error) {
        log(`User Stories Test Failed: ${error.response?.data?.message || error.message}`, 'error');
        if (error.response) console.log(JSON.stringify(error.response.data, null, 2));
    }
};

const run = async () => {
    await login();
    await testUserStories();
};

run();
