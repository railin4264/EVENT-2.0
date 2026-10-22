const mongoose = require('mongoose');
const { CATEGORY_ENUM } = require('../utils/categories');

const eventSchema = new mongoose.Schema({
  archivedAt: { type: Date, index: true },
  previousDate: { type: Date },
  rescheduledAt: { type: Date },
  practicalInfo: {
    arrival: { type: String, trim: true, maxlength: 500 },
    bring: { type: String, trim: true, maxlength: 500 },
    accessibility: { type: String, trim: true, maxlength: 500 },
    parking: { type: String, trim: true, maxlength: 500 },
    welcoming: { type: String, trim: true, maxlength: 500 }
  },
  outingBudget: {
    complete: { type: Boolean, default: false },
    mandatory: [{ _id: false, label: { type: String, maxlength: 100 }, amount: { type: Number, min: 0, max: 1000000 }, currency: { type: String, maxlength: 3 } }],
    optional: [{ _id: false, label: { type: String, maxlength: 100 }, amount: { type: Number, min: 0, max: 1000000 }, currency: { type: String, maxlength: 3 } }]
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot be more than 100 characters'],
    validate: {
      validator: function (v) {
        // Allow letters, numbers, spaces, accented characters, and common punctuation including parentheses
        return typeof v === 'string' && v.trim().length >= 3 && !/[\u0000-\u0008\u000E-\u001F]/.test(v);
      },
      message: 'Title contains invalid characters'
    }
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: CATEGORY_ENUM
  },
  date: {
    type: Date,
    required: [true, 'Please add an event date'],
    validate: {
      validator: function (v) {
        // Allow events to be created for past dates (for testing/demos)
        // but warn if too far in the future (more than 2 years)
        const twoYearsFromNow = new Date();
        twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
        return v <= twoYearsFromNow;
      },
      message: 'Event date cannot be more than 2 years in the future'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function (v) {
        if (!v) return true; // endDate is optional
        // Allow endDate to be equal to or after the start date
        return v >= this.date;
      },
      message: 'End date must be equal to or after start date'
    }
  },
  timeZone: {
    type: String,
    trim: true,
    maxlength: 100,
    validate: {
      validator: function (value) {
        if (value == null) return true;
        if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(value)) return false;
        try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; }
        catch (_) { return false; }
      },
      message: 'timeZone must be a valid IANA time zone'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: function () { return !this.isVirtual; },
      validate: {
        validator: function (v) {
          if (this.isVirtual && (!v || v.length === 0)) return true;
          // Validate coordinates [longitude, latitude]
          // Longitude: -180 to 180, Latitude: -90 to 90
          return v && v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 &&
            v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates. Format: [longitude, latitude]'
      }
    },
    address: {
      type: String,
      required: function () { return !this.isVirtual; },
      trim: true,
      minlength: [5, 'Address must be at least 5 characters'],
      maxlength: [200, 'Address cannot be more than 200 characters']
    },
    venue: {
      type: String,
      trim: true,
      maxlength: [100, 'Venue name cannot be more than 100 characters']
    },
    city: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    countryCode: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{2}$/, 'countryCode must contain two ISO country letters']
    }
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  eventType: {
    type: String,
    enum: ['in_person', 'virtual', 'hybrid'],
    default: 'in_person'
  },
  virtualPlatform: {
    type: String,
    enum: ['zoom', 'google_meet', 'youtube_live', 'twitch', 'kick', 'discord', 'teams', 'webinar', 'custom', 'other'],
    default: 'custom'
  },
  virtualDetails: {
    meetingId: { type: String, trim: true, maxlength: 100 },
    passcode: { type: String, trim: true, maxlength: 100 },
    streamEmbedUrl: { type: String, trim: true, maxlength: 500 },
    recordingUrl: { type: String, trim: true, maxlength: 500 },
    isStream: { type: Boolean, default: false },
    isWorkshop: { type: Boolean, default: false },
    isWebinar: { type: Boolean, default: false },
    prerequisites: [{ type: String, trim: true, maxlength: 200 }],
    calendarExportUrl: { type: String, trim: true, maxlength: 500 }
  },
  virtualLink: {
    type: String,
    trim: true,
    maxlength: [500, 'Virtual link cannot be more than 500 characters'],
    validate: {
      validator: function(value) {
        if (!value) return !this.isVirtual;
        try {
          const parsed = new URL(value);
          if (!['http:', 'https:'].includes(parsed.protocol)) return false;
          if (parsed.username || parsed.password) return false;
          return true;
        } catch {
          return false;
        }
      },
      message: 'Virtual events require a valid HTTP or HTTPS link'
    }
  },
  accessibility: [{
    type: String,
    enum: ['wheelchair', 'signLanguage', 'petFriendly', 'quietZone', 'hearingLoop', 'visualAids', 'other']
  }],
  images: [{
    url: String,
    publicId: String
  }],
  maxAttendees: {
    type: Number,
    min: [1, 'Maximum attendees must be at least 1'],
    max: [1000000, 'Maximum attendees cannot exceed 1,000,000'],
    validate: {
      validator: Number.isInteger,
      message: 'Maximum attendees must be a whole number'
    }
  },
  attendees: [{
    checkedInAt: { type: Date },
    checkedInBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['attending', 'maybe', 'not-attending', 'confirmed', 'pending'],
      default: 'attending'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isSolo: {
      type: Boolean,
      default: false
    },
    promoter: {
      type: String,
      trim: true,
      maxlength: 50
    }
  }],
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  // Display name of the organizer (populated for imported/demo events so the
  // card can show "by X" without an extra user lookup).
  organizer: {
    type: String,
    trim: true
  },
  // Cached count of interested users (denormalized so the card can render
  // "👥 N interesados" without loading the attendees array).
  interestedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'expired', 'pending_review'],
    default: 'published'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isUnofficial: {
    type: Boolean,
    default: false
  },
  isSecretLocation: {
    type: Boolean,
    default: false
  },
  isSoloFriendly: {
    type: Boolean,
    default: true
  },
  soloWelcomeNote: {
    type: String,
    trim: true,
    maxlength: 250,
    default: 'Mesa de bienvenida para quienes vienen solos. ¡Aquí nadie se queda aislado!'
  },
  soloWelcomeHost: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    meetingSpot: { type: String, trim: true },
    timeWindow: { type: String, trim: true },
    confirmed: { type: Boolean, default: false }
  },
  // --- Actividades Fijas, Comerciales & Hospitalidad ---
  isRecurring: { type: Boolean, default: false },
  recurringSchedule: {
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly', 'daily'], default: 'weekly' },
    dayName: { type: String, trim: true },
    timeText: { type: String, trim: true }
  },
  isCommercialDeal: { type: Boolean, default: false },
  commercialBrand: { type: String, trim: true },
  commercialOffer: { type: String, trim: true },
  isTourOrTrip: { type: Boolean, default: false },
  tourDetails: {
    departurePoint: { type: String, trim: true },
    includes: [{ type: String, trim: true }]
  },
  // --- Módulo Familiar, Niños, Bebés & Maternidad Segura ---
  familyDetails: {
    isFamilyEvent: { type: Boolean, default: false },
    targetAudience: {
      type: String,
      enum: ['babies', 'toddlers', 'kids', 'teens', 'parents', 'all_family'],
      default: 'all_family'
    },
    ageMinMonths: { type: Number, min: 0 },
    ageMaxMonths: { type: Number, min: 0 },
    strollerAccessible: { type: Boolean, default: false },
    nursingRoomAvailable: { type: Boolean, default: false },
    diaperChangingStation: { type: Boolean, default: false },
    supervisionRequired: { type: Boolean, default: true },
    safetyNotes: { type: String, trim: true, maxlength: 300 }
  },
  holidaySeason: {
    type: String,
    enum: ['none', 'mothers_day', 'fathers_day', 'valentines', 'childrens_day', 'easter', 'christmas', 'new_year', 'halloween', 'summer'],
    default: 'none'
  },
  holidayLabel: { type: String, trim: true, maxlength: 60 },

  // --- Módulo Salud Comunitaria & Estudios Científicos Acreditados ---
  healthDetails: {
    isHealthInitiative: { type: Boolean, default: false },
    healthType: {
      type: String,
      enum: ['none', 'community_clinic', 'blood_drive', 'pediatric_care', 'vaccination', 'clinical_trial_info', 'preventive_screening'],
      default: 'none'
    },
    hospitalOrInstitution: { type: String, trim: true, maxlength: 120 },
    clinicalTrialId: { type: String, trim: true, maxlength: 60 },
    ethicsApprovalRef: { type: String, trim: true, maxlength: 120 },
    medicalDisclaimer: {
      type: String,
      trim: true,
      maxlength: 400,
      default: 'Iniciativa de salud o estudio clínico informativo. Toda intervención requiere evaluación médica profesional y consentimiento informado formal conforme a las regulaciones sanitarias.'
    }
  },
  isOfficial: { type: Boolean, default: false },
  // --- Descubrimiento / monetización sin pasarela ---
  activityType: { type: String, trim: true, maxlength: 60 },
  source: { type: String, trim: true, index: true },
  sourceId: { type: String, trim: true },
  externalUrl: {
    type: String, trim: true, maxlength: 500,
    validate: { validator: v => !v || /^https?:\/\//i.test(v), message: 'externalUrl debe ser http(s)' }
  },
  ticketUrl: {
    type: String, trim: true, maxlength: 500,
    validate: {
      validator: function (v) {
        if (!v) return true;
        try {
          const u = new URL(v);
          return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password;
        } catch { return false; }
      },
      message: 'ticketUrl debe ser un enlace http(s) válido sin credenciales'
    }
  },
  paymentMode: { type: String, enum: ['free', 'onsite', 'door', 'external', 'platform'], default: 'free' },
  paymentInfo: { type: String, trim: true, maxlength: 300 },
  imported: { type: Boolean, default: false },
  importedAt: Date,
  publicSource: {
    name: String,
    datasetUrl: String,
    license: String,
    licenseUrl: String,
    checkedAt: Date,
    updatedAt: Date,
    providerStatus: String
  },
  // --- Indexación Espacial Jerárquica Uber H3 & Pipeline Planetario ---
  h3: {
    res3: { type: String, trim: true, index: true },
    res5: { type: String, trim: true, index: true },
    res7: { type: String, trim: true, index: true },
    res9: { type: String, trim: true, index: true }
  },
  pipelineMeta: {
    tier: { type: Number, enum: [1, 2, 3, 4], default: 3 },
    ingestedAt: { type: Date, default: Date.now },
    originalSourceUrl: String,
    rawSchemaType: String,
    language: { type: String, default: 'es' },
    confidenceScore: { type: Number, default: 1.0 },
    deduplicationClusterId: String,
    mergedSources: [{
      sourceName: String,
      sourceId: String,
      extractedAt: Date
    }]
  },
  isFeatured: { type: Boolean, default: false },
  featuredUntil: Date,
  featuredRank: { type: Number, default: 0 },
  promotionRequest: {
    requested: { type: Boolean, default: false },
    requestedAt: Date,
    note: { type: String, maxlength: 300 }
  },
  trendingScore: { type: Number, default: 0 },
  sourceIdeaId: { type: mongoose.Schema.ObjectId, ref: 'ActivityIdea' },
  vibeRadar: {
    currentVibe: {
      type: String,
      enum: ['lit', 'chill', 'packed', 'winding_down', 'none'],
      default: 'none'
    },
    lastReportedAt: Date,
    reportsCount: { type: Number, default: 0 },
    counts: {
      lit: { type: Number, default: 0 },
      chill: { type: Number, default: 0 },
      packed: { type: Number, default: 0 },
      winding_down: { type: Number, default: 0 }
    },
    recentReports: [{
      user: { type: mongoose.Schema.ObjectId, ref: 'User' },
      vibe: { type: String, enum: ['lit', 'chill', 'packed', 'winding_down'] },
      comment: { type: String, maxlength: 140 },
      reportedAt: { type: Date, default: Date.now }
    }]
  },
  coroMatchQueue: [{
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    role: { type: String, enum: ['seeking_coro', 'open_coro'], default: 'seeking_coro' },
    note: { type: String, trim: true, maxlength: 200 },
    whatsappContact: { type: String, trim: true, maxlength: 40 },
    joinedAt: { type: Date, default: Date.now }
  }],
  safetyCoro: {
    enabled: { type: Boolean, default: true },
    carpoolZones: [{ type: String, trim: true, maxlength: 50 }],
    registeredCarpoolers: [{
      user: { type: mongoose.Schema.ObjectId, ref: 'User' },
      zone: String,
      contactPhone: String,
      role: { type: String, enum: ['driver', 'passenger'], default: 'passenger' },
      registeredAt: { type: Date, default: Date.now }
    }]
  },
  localPaymentConfig: {
    allowBankTransfer: { type: Boolean, default: false },
    bankAccounts: [{
      bankName: { type: String, enum: ['Banco Popular Dominicano', 'Banco BHD', 'Banreservas', 'Qik Banco Digital', 'Otro'] },
      accountType: { type: String, enum: ['corriente', 'ahorro'], default: 'ahorro' },
      accountNumber: String,
      beneficiaryName: String,
      rncOrCedula: String
    }],
    tPagoPhone: String
  },
  boost: {
    tier: { type: String, enum: ['none', 'bronce', 'plata', 'oro'], default: 'none' },
    activatedAt: Date,
    expiresAt: Date,
    paidAmountDOP: { type: Number, default: 0 }
  },
  ageRestriction: {
    minAge: {
      type: Number,
      default: 0,
      min: [0, 'Minimum age cannot be negative']
    },
    maxAge: {
      type: Number,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return v >= this.ageRestriction.minAge;
        },
        message: 'Maximum age must be greater than or equal to minimum age'
      }
    },
    isAdultOnly: {
      type: Boolean,
      default: false
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Each tag cannot be more than 30 characters'],
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9\u00C0-\u017F_-]+$/.test(v);
      },
      message: 'Tags can only contain letters, numbers, hyphens and underscores'
    }
  }],
  price: {
    amount: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      max: [1000000, 'Price cannot exceed 1,000,000'],
      default: 0,
      validate: {
        validator: function (v) {
          // Allow up to 2 decimal places
          return /^\d+(\.\d{1,2})?$/.test(v.toString());
        },
        message: 'Price can have maximum 2 decimal places'
      }
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      enum: {
        values: ['USD', 'EUR', 'GBP', 'DOP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL',
          'VES', 'PYG', 'BOB', 'UYU', 'CRC', 'INR', 'EGP', 'AED', 'JPY', 'KRW',
          'AUD', 'CAD', 'CZK', 'SEK', 'NOK', 'DKK', 'CHF', 'PLN', 'TRY', 'ZAR', 'CNY', 'HKD', 'TWD', 'SGD', 'NZD'],
        message: 'Currency {VALUE} is not supported'
      }
    }
  },
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot be more than 500 characters']
    },
    likes: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    platform: {
      type: String,
      enum: ['whatsapp', 'facebook', 'twitter', 'telegram', 'linkedin', 'email', 'copy', 'feed']
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Performance indexes
eventSchema.index({ location: '2dsphere' });
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ status: 1 });

// Compound indexes for common queries
eventSchema.index({ status: 1, date: 1 }); // Published events by date
eventSchema.index({ status: 1, 'location.countryCode': 1, date: 1 });
eventSchema.index({ status: 1, category: 1 }); // Published events by category
eventSchema.index({ createdBy: 1, date: -1 }); // User's events by newest
eventSchema.index({ category: 1, date: 1 }); // Category events by date
eventSchema.index({ 'price.amount': 1, date: 1 }); // Price range queries
eventSchema.index({ location: '2dsphere', date: 1 }); // Geo + date queries

// Modo de pago derivado: sin Stripe la app es informativa (pago en sitio o enlace externo).
eventSchema.pre('validate', function (next) {
  // An online event may have no geographic point. MongoDB rejects GeoJSON
  // containing only type:'Point'; omit it rather than inventing coordinates.
  if (this.isVirtual && (!this.location?.coordinates || this.location.coordinates.length === 0)) {
    this.set('location', undefined);
  }
  const amount = this.price && this.price.amount ? this.price.amount : 0;
  if (amount <= 0) {
    this.paymentMode = 'free';
  } else if (this.paymentMode === 'free' || !this.paymentMode) {
    this.paymentMode = this.ticketUrl ? 'external' : 'onsite';
  }
  next();
});

eventSchema.index({ isFeatured: 1, featuredUntil: 1, featuredRank: -1 });
eventSchema.index({ source: 1, sourceId: 1 }, { unique: true, partialFilterExpression: { sourceId: { $type: 'string' } } });
eventSchema.index({ trendingScore: -1, date: 1 });
eventSchema.index({ 'h3.res7': 1, date: 1 });
eventSchema.index({ 'h3.res9': 1, date: 1 });

// Text search index
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Performance optimization for attendee lookups
eventSchema.index({ 'attendees.user': 1 });

// Virtual for attendees count
eventSchema.virtual('attendeesCount').get(function () {
  return this.attendees ? this.attendees.length : 0;
});

// Virtual for likes count
eventSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

// Method to check if user liked the event
eventSchema.methods.isLikedByUser = function (userId) {
  return this.likes && this.likes.some(like =>
    like.user && like.user.toString() === userId.toString()
  );
};

// Method to check if event has expired
eventSchema.methods.isExpired = function () {
  const now = new Date();
  const eventEndDate = this.endDate || this.date;
  return eventEndDate < now;
};

// Method to mark event as expired
eventSchema.methods.markAsExpired = async function () {
  if (this.isExpired() && this.status === 'published') {
    this.status = 'expired';
    await this.save();
    return true;
  }
  return false;
};

// Static method to expire all past events
eventSchema.statics.expirePastEvents = async function () {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'published',
      $or: [
        { endDate: { $lt: now } },
        { endDate: null, date: { $lt: now } }
      ]
    },
    { $set: { status: 'expired' } }
  );
  return result;
};

// Pre-find middleware disabled to allow showing all events
// Event filtering should be done in the controllers/routes
// eventSchema.pre(/^find/, function(next) {
//   // Only apply if query doesn't explicitly include expired events
//   if (!this.getQuery().status) {
//     const now = new Date();
//     // Auto-mark as expired on query
//     this.find({
//       $or: [
//         { status: { $ne: 'published' } },
//         { endDate: { $gte: now } },
//         { endDate: null, date: { $gte: now } }
//       ]
//     });
//   }
//   next();
// });

module.exports = mongoose.model('Event', eventSchema);





