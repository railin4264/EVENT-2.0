const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

// Helper for requests
async function request(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            data,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        };
        return await axios(config);
    } catch (error) {
        return error.response;
    }
}

async function runTests() {
    console.log('🚀 Starting Tribes & Feed Verification...');

    // 1. Setup Users
    console.log('\n1️⃣  Setting up Users...');
    const adminUser = {
        username: `tribe_admin_${Date.now()}`,
        email: `admin${Date.now()}@test.com`,
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        birthDate: '1990-01-01',
        acceptTerms: true
    };
    const memberUser = {
        username: `tribe_member_${Date.now()}`,
        email: `member${Date.now()}@test.com`,
        password: 'Password123!',
        firstName: 'Member',
        lastName: 'User',
        birthDate: '1995-01-01',
        acceptTerms: true
    };

    const adminReg = await request('POST', '/auth/register', adminUser);
    const adminToken = adminReg.data?.accessToken;
    const adminId = adminReg.data?.user?._id;
    console.log('   Admin registered:', !!adminToken);

    const memberReg = await request('POST', '/auth/register', memberUser);
    const memberToken = memberReg.data?.accessToken;
    console.log('   Member registered:', !!memberToken);

    if (!adminToken || !memberToken) {
        console.error('❌ Failed to register users');
        return;
    }

    // 2. Create Tribe
    console.log('\n2️⃣  Testing Tribe Creation...');
    const tribeData = {
        name: `Tech Tribe ${Date.now()}`,
        description: 'A community for tech enthusiasts',
        category: 'technology',
        isPublic: true,
        tags: ['tech', 'coding']
    };

    const createTribeRes = await request('POST', '/tribes', tribeData, adminToken);
    if (createTribeRes.status === 201) {
        console.log('   ✅ Tribe Created:', createTribeRes.data.tribe.name);
    } else {
        console.log('   ❌ Tribe Creation Failed:', createTribeRes.data);
        return;
    }
    const tribeId = createTribeRes.data.tribe._id;

    // 3. Join Tribe
    console.log('\n3️⃣  Testing Join Tribe...');
    const joinRes = await request('POST', `/tribes/${tribeId}/join`, {}, memberToken);
    if (joinRes.status === 200) {
        console.log('   ✅ Member Joined Tribe');
    } else {
        console.log('   ❌ Join Tribe Failed:', joinRes.data);
    }

    // 4. Tribe Feed (Posts)
    console.log('\n4️⃣  Testing Tribe Feed...');
    // Admin Post
    const postData = { content: 'Welcome to the tech tribe!' };
    const postRes = await request('POST', `/tribes/${tribeId}/posts`, postData, adminToken);
    if (postRes.status === 201) {
        console.log('   ✅ Admin Posted successfully');
    } else {
        console.log('   ❌ Admin Post Failed:', postRes.data);
    }
    const postId = postRes.data?.post?._id;

    // Member Comment
    if (postId) {
        const commentData = { content: 'Thanks for having me!' };
        // Note: Assuming endpoint structure /tribes/:id/posts/:postId/comments based on typical REST
        // Verifying endpoint in next step if this fails, but attempting standard pattern first
        const commentRes = await request('POST', `/tribes/${tribeId}/posts/${postId}/comments`, commentData, memberToken);

        // Fallback if that route doesn't exist, maybe it's a general comments route? 
        // Checking tribes.js route file suggests nested routes usually.

        if (commentRes.status === 201 || commentRes.status === 200) {
            console.log('   ✅ Member Commented successfully');
        } else {
            console.log('   ⚠️ Member Comment Failed (might need to verify route):', commentRes.status);
        }

        // Like Post
        const likeRes = await request('POST', `/tribes/${tribeId}/posts/${postId}/like`, {}, memberToken);
        if (likeRes.status === 200) {
            console.log('   ✅ Member Liked Post');
        } else {
            console.log('   ❌ Like Post Failed:', likeRes.data);
        }
    }

    // 5. Get Tribe Feed
    const feedRes = await request('GET', `/tribes/${tribeId}/posts`, null, memberToken);
    if (feedRes.status === 200 && feedRes.data.posts.length > 0) {
        console.log('   ✅ Tribe Feed Retrieved:', feedRes.data.posts.length, 'posts');
    } else {
        console.log('   ❌ Get Feed Failed:', feedRes.data);
    }

    console.log('\n✨ Tribes & Feed Verification Complete!');
}

runTests();
