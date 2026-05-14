const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  quantity:     { type: Number, required: true },
});

const cartSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  expiresAt: { type: Date, required: true },
  items:     [cartItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
