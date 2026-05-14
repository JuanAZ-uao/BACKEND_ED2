const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastFour:    { type: String, required: true },
  brand:       { type: String, required: true },
  expiryMonth: { type: Number, required: true },
  expiryYear:  { type: Number, required: true },
  isPrimary:   { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
