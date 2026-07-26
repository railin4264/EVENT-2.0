const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1:27017/eventconnect');
    const db = mongoose.connection.db;

    const stories = await db.collection('stories').find({}).toArray();
    console.log('Stories count:', stories.length);
    if (stories.length > 0) {
        console.log(JSON.stringify(stories[0], null, 2));
    }

    const badStories = await db.collection('stories').aggregate([
        { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'authorDoc' } },
        { $match: { authorDoc: { $size: 0 } } }
    ]).toArray();
    console.log('Orphan stories:', badStories.length);

    // also check if there are bad views or likes
    const badViews = stories.filter(s => s.views && s.views.some(v => !v.user));
    console.log('Stories with null views:', badViews.length);

    process.exit(0);
}

check().catch(console.error);
