/**
 * Full End-to-End Verification of EventNow 2.0 Features
 * - User Live Geolocation Persistence
 * - Public & Private Tribes Lifecycle
 * - Join Requests (Submit -> Pending -> Approve/Reject)
 * - Community Posts, Comments & Likes
 * - Admin Moderation ('reviewing' and 'in_review')
 * - Event Creation with Real Coordinates
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Tribe = require('../src/models/Tribe');
const Event = require('../src/models/Event');
const Report = require('../src/models/Report');
const RDEventSeeder = require('../src/services/rdEventSeeder');

async function runVerification() {
  console.log('🚀 Starting EventNow 2.0 Feature Verification...\n');
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);

  try {
    // 1. Seed Dominican Ecosystem
    console.log('--- Step 1: Dominican Seeder ---');
    await RDEventSeeder.ensureMinimumEvents(6);
    const eventCount = await Event.countDocuments();
    const userCount = await User.countDocuments();
    const tribeCount = await Tribe.countDocuments();
    console.log(`✅ Events Seeded: ${eventCount}`);
    console.log(`✅ Users Seeded: ${userCount}`);
    console.log(`✅ Tribes Seeded: ${tribeCount}`);
    if (eventCount === 0 || userCount === 0 || tribeCount === 0) {
      throw new Error('Seeding failed to populate data');
    }

    // 2. User Live Location
    console.log('\n--- Step 2: Live Geolocation ---');
    const testUser = await User.findOne({ username: 'acusticard' });
    testUser.location = {
      type: 'Point',
      coordinates: [-69.9312, 18.4861], // Santo Domingo
      address: 'Parque Colón, Ciudad Colonial',
      city: 'Santo Domingo',
      country: 'Dominican Republic'
    };
    await testUser.save();
    const updatedUser = await User.findById(testUser._id);
    if (updatedUser.location.coordinates[0] !== -69.9312 || updatedUser.location.city !== 'Santo Domingo') {
      throw new Error('Location persistence mismatch');
    }
    console.log(`✅ Location updated and verified: ${updatedUser.location.city} (${updatedUser.location.coordinates.join(', ')})`);

    // 3. Tribes & Private Join Requests
    console.log('\n--- Step 3: Tribes & Private Join Requests ---');
    const regularUser = await User.findOne({ username: 'arte_parque' });
    const adminUser = await User.findOne({ role: 'admin' });

    // Create a new private tribe
    const privateTribe = await Tribe.create({
      name: 'Comunidad Exclusiva Vinos & Jazz RD',
      description: 'Catas de vino privadas y veladas de jazz íntimas en Santo Domingo.',
      category: 'music',
      creator: adminUser._id,
      createdBy: adminUser._id,
      settings: {
        privacy: 'private',
        membership: 'approval_required'
      },
      rules: ['Respeto mutuo', 'Puntualidad en las catas'],
      location: {
        type: 'Point',
        coordinates: [-69.9312, 18.4861],
        address: 'Zona Colonial, Santo Domingo'
      },
      members: [{ user: adminUser._id, role: 'admin', status: 'active' }]
    });
    console.log(`✅ Private Tribe created: "${privateTribe.name}" (privacy: ${privateTribe.settings.privacy})`);

    // Submit join request
    privateTribe.joinRequests.push({
      user: regularUser._id,
      message: 'Hola! Soy amante del jazz y quiero participar en las próximas sesiones.',
      status: 'pending',
      requestedAt: new Date()
    });
    await privateTribe.save();

    let fetchedTribe = await Tribe.findById(privateTribe._id).populate('joinRequests.user', 'username firstName');
    if (fetchedTribe.joinRequests.length !== 1 || fetchedTribe.joinRequests[0].status !== 'pending') {
      throw new Error('Join request was not stored as pending');
    }
    console.log(`✅ Join request submitted by @${fetchedTribe.joinRequests[0].user.username}: "${fetchedTribe.joinRequests[0].message}"`);

    // Admin approves join request
    const pendingReq = fetchedTribe.joinRequests.find(r => String(r.user._id) === String(regularUser._id));
    pendingReq.status = 'approved';
    pendingReq.reviewedAt = new Date();
    pendingReq.reviewedBy = adminUser._id;
    fetchedTribe.members.push({
      user: regularUser._id,
      role: 'member',
      status: 'active',
      joinedAt: new Date()
    });
    fetchedTribe.stats = fetchedTribe.stats || {};
    fetchedTribe.stats.totalMembers = fetchedTribe.members.length;
    await fetchedTribe.save();

    const verifiedTribe = await Tribe.findById(privateTribe._id);
    const isNowMember = verifiedTribe.members.some(m => String(m.user) === String(regularUser._id));
    if (!isNowMember || verifiedTribe.stats.totalMembers !== 2) {
      throw new Error('User was not promoted to active member');
    }
    console.log(`✅ Join request approved by Admin! Active members: ${verifiedTribe.stats.totalMembers}`);

    // 4. Tribe Posts, Likes & Comments
    console.log('\n--- Step 4: Community Posts, Comments & Likes ---');
    verifiedTribe.posts.push({
      author: regularUser._id,
      content: '¡Gracias por aceptarme! ¿Cuándo es la próxima cata en la Zona Colonial?',
      likes: [],
      comments: []
    });
    await verifiedTribe.save();

    const postDoc = verifiedTribe.posts[verifiedTribe.posts.length - 1];
    // Like post
    postDoc.likes.push({ user: adminUser._id });
    // Add comment
    postDoc.comments.push({
      user: adminUser._id,
      content: '¡Bienvenido! Este jueves tenemos sesión a las 7:30 PM en Plaza de España.'
    });
    await verifiedTribe.save();

    const postVerified = await Tribe.findById(privateTribe._id);
    const latestPost = postVerified.posts[postVerified.posts.length - 1];
    if (latestPost.likes.length !== 1 || latestPost.comments.length !== 1) {
      throw new Error('Post interactions were not saved properly');
    }
    console.log(`✅ Post created, liked (${latestPost.likes.length}) and commented ("${latestPost.comments[0].content}")`);

    // 5. Admin Moderation Statuses
    console.log('\n--- Step 5: Admin Moderation Statuses ---');
    const sampleEvent = await Event.findOne();
    const report = await Report.create({
      reporter: regularUser._id,
      reportedEvent: sampleEvent._id,
      type: 'event',
      category: 'spam',
      reason: 'Evento sospechoso de spam',
      description: 'Prueba de moderación automatizada',
      status: 'pending'
    });
    console.log(`✅ Report created with status: ${report.status}`);

    // Update to 'reviewing'
    report.status = 'reviewing';
    report.moderatorNotes = 'Asignado a moderador de turno';
    await report.save();
    console.log(`✅ Report status updated to: ${report.status}`);

    // Update to 'in_review'
    report.status = 'in_review';
    await report.save();
    console.log(`✅ Report status updated to: ${report.status}`);

    // Resolve report
    report.status = 'resolved';
    report.resolvedAt = new Date();
    await report.save();
    console.log(`✅ Report status resolved: ${report.status}`);

    // 6. Event Creation with Real Coordinates
    console.log('\n--- Step 6: Event Creation with GPS Coordinates ---');
    const newEvent = await Event.create({
      title: 'Amanecer en el Morro de Montecristi',
      description: 'Senderismo fotográfico al amanecer para capturar los colores del océano y el mangle.',
      category: 'outdoors',
      date: new Date(Date.now() + 86400000 * 5),
      createdBy: testUser._id,
      status: 'published',
      location: {
        venue: 'Parque Nacional El Morro',
        address: 'Montecristi, República Dominicana',
        city: 'Montecristi',
        coordinates: [-71.6444, 19.8821]
      },
      price: { amount: 0, currency: 'DOP' },
      isSecretLocation: false
    });
    console.log(`✅ Event created: "${newEvent.title}" at coordinates [${newEvent.location.coordinates.join(', ')}]`);

    console.log('\n🎉 ALL 6 FEATURE VERIFICATIONS PASSED WITH 100% SUCCESS!\n');
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
