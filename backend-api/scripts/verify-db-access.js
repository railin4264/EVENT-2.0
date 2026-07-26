const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

async function verifyAccess() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect';
        console.log(`Connecting to ${mongoUri}...`);
        await mongoose.connect(mongoUri);
        console.log('✅ Connected.');

        console.log('Querying Users...');
        try {
            const user = await User.findOne();
            console.log('✅ User query success. Found:', user ? user._id : 'null');
        } catch (e) {
            console.error('❌ User query failed:', e.message);
        }

        console.log('Querying Events...');
        try {
            const event = await Event.findOne();
            console.log('✅ Event query success. Found:', event ? event._id : 'null');
        } catch (e) {
            console.error('❌ Event query failed:', e.message);
        }

        // Try geospatial query if simple query works
        console.log('Querying Events with Geo...');
        try {
            const events = await Event.find({
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [-69.868895, 18.535486]
                        },
                        $maxDistance: 10000
                    }
                }
            }).limit(1);
            console.log('✅ Event Geo query success. Found:', events.length);
        } catch (e) {
            console.error('❌ Event Geo query failed:', e.message);
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

verifyAccess();
