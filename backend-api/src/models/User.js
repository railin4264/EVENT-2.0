const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String
  },
  interests: [{
    type: String,
    trim: true
  }],
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]*$/, 'Invalid phone number format']
  },
  coverImage: {
    type: String
  },
  socialLinks: {
    website: String,
    instagram: String,
    twitter: String,
    linkedin: String
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  birthDate: {
    type: Date,
    required: [true, 'Please add your date of birth'],
    trim: true
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      eventReminders: { type: Boolean, default: true },
      newMessages: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false }
    },
    privacy: {
      showProfile: { type: Boolean, default: true },
      showAttendedEvents: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: false }
    },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      language: { type: String, default: 'es' },
      timezone: { type: String, default: 'America/Mexico_City' }
    }
  },
  // Activity tracking arrays
  eventsAttended: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  eventsCreated: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  tribesJoined: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tribe'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Push notification tokens
  pushTokens: [{
    token: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
    deviceId: { type: String },
    registeredAt: { type: Date, default: Date.now }
  }],
  // Notification settings
  notificationSettings: {
    pushEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    categories: {
      events: { type: Boolean, default: true },
      social: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
      system: { type: Boolean, default: true }
    }
  },

  // Two-Factor Authentication
  twoFactor: {
    isEnabled: { type: Boolean, default: false },
    secret: { type: String, select: false },
    tempSecret: { type: String, select: false },
    setupToken: { type: String, select: false },
    setupInitiatedAt: { type: Date },
    enabledAt: { type: Date },
    disabledAt: { type: Date },
    disabledReason: { type: String },
    backupCodes: [{
      code: { type: String, required: true },
      used: { type: Boolean, default: false },
      usedAt: { type: Date },
      generatedAt: { type: Date, default: Date.now }
    }],
    backupCodesRegeneratedAt: { type: Date }
  },

  // Authentication tokens for session management
  tokens: [{
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  // Refresh tokens for JWT rotation
  refreshTokens: [{ type: String }],

  // Account verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },

  // Password reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // Login tracking
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  // OAuth accounts
  oauthAccounts: [{
    provider: { type: String, required: true }, // 'google', 'facebook', etc.
    providerId: { type: String, required: true },
    email: { type: String },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: { type: Date },
    linkedAt: { type: Date, default: Date.now },
    lastUsed: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate age from birthDate
userSchema.virtual('age').get(function () {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Geospatial index for location-based search
userSchema.index({ location: '2dsphere' }, { sparse: true });

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  const jwt = require('jsonwebtoken');
  // Use JWT_EXPIRES_IN (from env) or default to 24h
  const expiresIn = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '24h';
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: expiresIn
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Performance indexes
// Note: email and username already have unique: true in schema definition
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Compound indexes for common queries
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ isActive: 1, createdAt: -1 });

// Social features indexes
userSchema.index({ 'followers.user': 1 });
userSchema.index({ 'following.user': 1 });

// Search optimization
userSchema.index({ firstName: 'text', lastName: 'text', username: 'text' });

module.exports = mongoose.model('User', userSchema);





