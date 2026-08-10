const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot be more than 100 characters'],
    validate: {
      validator: function (v) {
        // Allow letters, numbers, spaces, accented characters, and common punctuation including parentheses
        return /^[a-zA-Z0-9\s\u00C0-\u017F\u0400-\u04FF.,!?'()\-:;&"/@#$%*+=[\]{}|~`<>]+$/.test(v);
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
    enum: [
      'music', 'música',
      'sports', 'deportes',
      'social', 'sociales',
      'technology', 'tecnologia', 'tecnología', 'tech',
      'food', 'comida', 'gastronomía',
      'art', 'arte',
      'business', 'negocios', 'empresarial',
      'education', 'educación', 'educacion',
      'party', 'fiesta',
      'health', 'salud', 'wellness',
      'other', 'otro'
    ]
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
    }
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  virtualLink: {
    type: String,
    trim: true,
    maxlength: [500, 'Virtual link cannot be more than 500 characters']
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
    }
  }],
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'expired'],
    default: 'published'
  },
  isPrivate: {
    type: Boolean,
    default: false
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
        values: ['USD', 'EUR', 'GBP', 'DOP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'],
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
eventSchema.index({ status: 1, category: 1 }); // Published events by category
eventSchema.index({ createdBy: 1, date: -1 }); // User's events by newest
eventSchema.index({ category: 1, date: 1 }); // Category events by date
eventSchema.index({ 'price.amount': 1, date: 1 }); // Price range queries
eventSchema.index({ location: '2dsphere', date: 1 }); // Geo + date queries

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





