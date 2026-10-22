const mongoose = require('mongoose');

const eventSongSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  artist: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  spotifyUrl: {
    type: String,
    trim: true
  },
  youtubeUrl: {
    type: String,
    trim: true
  },
  votes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  votesCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

eventSongSchema.index({ event: 1, votesCount: -1 });

module.exports = mongoose.model('EventSong', eventSongSchema);
