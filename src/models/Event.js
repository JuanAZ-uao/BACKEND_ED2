const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: String,
  date:        { type: Date, required: true },
  venueId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
  imageUrl:    String,
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
    default: 'PUBLISHED',
  },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
