const mongoose = require('mongoose');

const concertSchema = new mongoose.Schema({
  artistId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
  tourName:    { type: String, required: true },
  description: String,
  date:        { type: Date, required: true },
  doorsOpenAt: Date,
  endDate:     Date,
  venueId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  imageUrl:    String,
  bannerUrl:   String,
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'LIVE', 'SOLD_OUT', 'CANCELLED', 'COMPLETED'],
    default: 'PUBLISHED',
  },
  isFeatured:  { type: Boolean, default: false },
  genres:      [String],
  viewerCount: { type: Number, default: 0 },
}, { timestamps: true });

concertSchema.index({ date: 1 });
concertSchema.index({ artistId: 1 });
concertSchema.index({ venueId: 1 });
concertSchema.index({ status: 1 });

module.exports = mongoose.model('Concert', concertSchema);
