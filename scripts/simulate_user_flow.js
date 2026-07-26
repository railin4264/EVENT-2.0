// Using native fetch in Node 18+

const BASE_URL = 'http://localhost:5000/api';
let AUTH_TOKEN = '';
let USER_ID = '';
let EVENT_ID = '';
let STORY_ID = '';

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

function log(msg, type = 'info') {
    const color = type === 'success' ? colors.green : type === 'error' ? colors.red : type === 'warn' ? colors.yellow : colors.cyan;
    console.log(`${color}[${type.toUpperCase()}] ${msg}${colors.reset}`);
}

async function request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        const data = await res.json();
        return { status: res.status, data };
    } catch (error) {
        return { status: 500, error: error.message };
    }
}

async function runTest() {
    log('Starting Deep User Flow Simulation...', 'info');

    // 1. Register
    const uniqueId = Date.now();
    const userData = {
        username: `tester_${uniqueId}`,
        email: `tester_${uniqueId}@example.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        birthDate: '2000-01-01',
        acceptTerms: true,
        age: 25 // 18+
    };

    log(`Attempting Register: ${userData.username}`, 'info');
    const regRes = await request('/auth/register', 'POST', userData);

    if (regRes.status === 201 || regRes.status === 200) {
        log('Registration Successful', 'success');
        AUTH_TOKEN = regRes.data.accessToken;
        USER_ID = regRes.data.user._id;
    } else {
        log(`Registration Failed: ${JSON.stringify(regRes.data)}`, 'error');
        process.exit(1);
    }

    // 2. Get Profile
    const profileRes = await request('/users/profile', 'GET', null, AUTH_TOKEN);
    if (profileRes.status === 200) {
        log('Profile Fetch Successful', 'success');
    } else {
        log(`Profile Fetch Failed: ${profileRes.status}`, 'error');
    }

    // 3. Get Feed
    const feedRes = await request('/feed', 'GET', null, AUTH_TOKEN);
    if (feedRes.status === 200) {
        log(`Feed Fetch Successful (Items: ${feedRes.data.feed?.length || 0})`, 'success');
        // Try to find an event to join
        const event = feedRes.data.feed?.find(i => i.type === 'event');
        if (event) EVENT_ID = event.data._id;
    } else {
        log(`Feed Fetch Failed: ${feedRes.status}`, 'error');
    }

    // 4. Create Story (Text)
    const storyData = {
        content: "Hello World! This is an automated test story.",
        style: { background: "gradient-primary" }
    };
    const storyRes = await request('/stories', 'POST', storyData, AUTH_TOKEN);
    if (storyRes.status === 201) {
        log(`Story Created Successfuly (ID: ${storyRes.data.data._id})`, 'success');
        STORY_ID = storyRes.data.data._id;
    } else {
        log(`Story Creation Failed: ${JSON.stringify(storyRes.data)}`, 'error');
    }

    // 5. Like Own Story
    if (STORY_ID) {
        const likeRes = await request(`/stories/${STORY_ID}/like`, 'POST', null, AUTH_TOKEN);
        if (likeRes.status === 200) {
            log('Like Story Successful', 'success');
        } else {
            log(`Like Story Failed: ${likeRes.status}`, 'error');
        }
    }

    // 6. View Own Story
    if (STORY_ID) {
        const viewRes = await request(`/stories/${STORY_ID}/view`, 'POST', null, AUTH_TOKEN);
        if (viewRes.status === 200) {
            log('View Story Successful', 'success');
        } else {
            log(`View Story Failed: ${viewRes.status}`, 'error');
        }
    }

    // 7. Get My Stories
    const myStoriesRes = await request('/stories/my-stories', 'GET', null, AUTH_TOKEN);
    if (myStoriesRes.status === 200 && myStoriesRes.data.stories.length > 0) {
        log('Fetch My Stories Successful', 'success');
    } else {
        log(`Fetch My Stories Failed or Empty: ${myStoriesRes.status}`, 'warn');
    }

    log('Simulation Complete.', 'info');
}

runTest();
