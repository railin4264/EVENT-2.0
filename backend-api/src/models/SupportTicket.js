const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [4000, 'Message cannot exceed 4000 characters']
  },
  attachments: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'ticketing',
      'fraud_report',
      'organizer_verification',
      'technical',
      'idea_zone',
      'billing',
      'other'
    ],
    default: 'other',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  messages: [supportMessageSchema],
  resolutionNotes: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  }
}, {
  timestamps: true
});

supportTicketSchema.index({ user: 1, status: 1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

// Generate friendly ticket number before saving
supportTicketSchema.pre('validate', async function (next) {
  if (!this.ticketNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().getFullYear().toString();
    this.ticketNumber = `TK-${dateStr}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
