const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  concertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concert', required: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  comment:   String,
}, { timestamps: true });

reviewSchema.index({ userId: 1, concertId: 1 }, { unique: true });
reviewSchema.index({ concertId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
