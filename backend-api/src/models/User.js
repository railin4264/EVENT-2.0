const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Serialization is the last boundary before a user document reaches clients.
// Keep credentials available to auth services, but never in JSON or spreads.
function redactCredentials(doc, result) {
  for (const key of ['password', 'tokens', 'refreshTokens', 'revokedTokens',
    'resetPasswordToken', 'resetPasswordExpires', 'emailVerificationToken',
    'emailVerificationExpires', 'sessionVersion', 'loginAttempts', 'lockUntil']) {
    delete result[key];
  }
  if (result.twoFactor) {
    result.twoFactor = { isEnabled: Boolean(result.twoFactor.isEnabled) };
  }
  if (result.oauthAccounts) {
    result.oauthAccounts = result.oauthAccounts.map(account => ({ provider: account.provider, linkedAt: account.linkedAt }));
  }
  delete result.pushTokens;
  return result;
}

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
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
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
    default: '',
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
    address: String,
    city: String,
    country: String,
    countryCode: String,
    updatedAt: Date
  },
  interests: [{
    type: String,
    trim: true
  }],
  country: {
    type: String,
    trim: true,
    default: 'República Dominicana'
  },
  countryCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'DO'
  },
  preferredLocale: {
    type: String,
    trim: true,
    default: 'es-DO'
  },
  preferredCurrency: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'DOP'
  },
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
  isOrganizerVerified: {
    type: Boolean,
    default: false
  },
  organizerVerification: {
    status: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none'
    },
    organizationName: { type: String, trim: true },
    documentType: {
      type: String,
      enum: ['cedula', 'passport', 'rnc', 'business_license', 'other']
    },
    documentNumber: { type: String, trim: true },
    socialProofUrl: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  birthDate: {
    type: Date,
    required: false,
    trim: true
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      eventReminders: { type: Boolean, default: true },
      newMessages: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
      friendPlans: { type: Boolean, default: false },
      shareAttendance: { type: Boolean, default: false }
    },
    privacy: {
      showProfile: { type: Boolean, default: true },
      showAttendedEvents: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: false }
    },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      language: { type: String, default: 'es' },
      timezone: { type: String, default: 'America/Santo_Domingo' },
      contentFilterMode: {
        type: String,
        enum: ['all', 'whitelist', 'blacklist'],
        default: 'all'
      },
      preferredCategories: [{ type: String, trim: true }],
      hiddenCategories: [{ type: String, trim: true }],
      hidePolitical: { type: Boolean, default: false },
      hideReligious: { type: Boolean, default: false },
      hideAdultOnly: { type: Boolean, default: true }
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
    enum: ['user', 'organizer', 'creator', 'admin', 'system'],
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
    channelPreferences: { type: mongoose.Schema.Types.Mixed, default: {} },
    pushEnabled: { type: Boolean, default: false },
    emailEnabled: { type: Boolean, default: false },
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

  // Revoked access tokens (blacklist). When a token is present here it is
  // rejected by the protect middleware even though its signature is valid.
  // Used to invalidate sessions on logout-all / password change.
  revokedTokens: [{ type: String }],

  // Account verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },

  // Password reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  sessionVersion: { type: Number, default: 0 },

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
  }],

  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  points: { type: Number, default: 0 },

  gamification: {
    totalXP: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xpHistory: [{
      amount: Number,
      source: String,
      description: String,
      metadata: mongoose.Schema.Types.Mixed,
      timestamp: { type: Date, default: Date.now }
    }],
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserAchievement' }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: redactCredentials },
  toObject: { virtuals: true, transform: redactCredentials }
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
  return jwt.sign(
    {
      id: this._id,
      type: 'access',
      sessionVersion: this.sessionVersion || 0
    },
    process.env.JWT_SECRET,
    {
      expiresIn: expiresIn,
      issuer: 'eventconnect-api',
      audience: 'eventconnect-clients'
    }
  );
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

// Search optimization
userSchema.index({ firstName: 'text', lastName: 'text', username: 'text' });

module.exports = mongoose.model('User', userSchema);
