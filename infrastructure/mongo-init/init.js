// MongoDB initialization script
db = db.getSiblingDB('eventconnect');

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('events');
db.createCollection('tribes');
db.createCollection('notifications');
db.createCollection('chats');

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ location: "2dsphere" });
db.users.createIndex({ createdAt: 1 });

// Events collection indexes
db.events.createIndex({ location: "2dsphere" });
db.events.createIndex({ date: 1 });
db.events.createIndex({ createdBy: 1 });
db.events.createIndex({ category: 1 });
db.events.createIndex({ status: 1 });
db.events.createIndex({ title: "text", description: "text" });

// Tribes collection indexes
db.tribes.createIndex({ name: 1 }, { unique: true });
db.tribes.createIndex({ createdBy: 1 });
db.tribes.createIndex({ members: 1 });
db.tribes.createIndex({ category: 1 });

// Notifications collection indexes
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ read: 1 });
db.notifications.createIndex({ type: 1 });

// Chats collection indexes
db.chats.createIndex({ participants: 1 });
db.chats.createIndex({ eventId: 1 });
db.chats.createIndex({ createdAt: -1 });

print('✅ EventConnect database initialized successfully!');





