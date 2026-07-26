const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'trialing', 'past_due'],
    default: 'active',
    required: true
  },
  billingPeriod: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'usd'
  },
  features: {
    maxEventsPerMonth: {
      type: Number,
      default: 3 // Free plan default
    },
    maxAttendeesPerEvent: {
      type: Number,
      default: 50
    },
    canCreatePaidEvents: {
      type: Boolean,
      default: false
    },
    analyticsAccess: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    removeWatermark: {
      type: Boolean,
      default: false
    }
  },
  stripeCustomerId: {
    type: String
  },
  stripeSubscriptionId: {
    type: String
  },
  stripeProductId: {
    type: String
  },
  stripePriceId: {
    type: String
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  cancelledAt: {
    type: Date
  },
  trialStart: {
    type: Date
  },
  trialEnd: {
    type: Date
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Methods
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' || this.status === 'trialing';
};

subscriptionSchema.methods.canAccessFeature = function(feature) {
  return this.features[feature] === true;
};

subscriptionSchema.methods.hasActiveSubscription = function() {
  if (!this.currentPeriodEnd) return false;
  return this.currentPeriodEnd > new Date() && this.isActive();
};

// Statics
subscriptionSchema.statics.getActiveSubscription = async function(userId) {
  return await this.findOne({
    userId,
    status: { $in: ['active', 'trialing'] },
    $or: [
      { currentPeriodEnd: { $gt: new Date() } },
      { currentPeriodEnd: null }
    ]
  }).sort({ createdAt: -1 });
};

subscriptionSchema.statics.getPlanLimits = function(plan) {
  const plans = {
    free: {
      maxEventsPerMonth: 3,
      maxAttendeesPerEvent: 50,
      canCreatePaidEvents: false,
      analyticsAccess: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
      removeWatermark: false,
      price: 0
    },
    basic: {
      maxEventsPerMonth: 10,
      maxAttendeesPerEvent: 200,
      canCreatePaidEvents: true,
      analyticsAccess: true,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
      removeWatermark: true,
      price: 29
    },
    premium: {
      maxEventsPerMonth: 50,
      maxAttendeesPerEvent: 1000,
      canCreatePaidEvents: true,
      analyticsAccess: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
      removeWatermark: true,
      price: 99
    },
    enterprise: {
      maxEventsPerMonth: -1, // Unlimited
      maxAttendeesPerEvent: -1, // Unlimited
      canCreatePaidEvents: true,
      analyticsAccess: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
      removeWatermark: true,
      price: 299
    }
  };

  return plans[plan] || plans.free;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
