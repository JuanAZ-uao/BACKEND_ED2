const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  quantity:     { type: Number, required: true },
  unitPrice:    { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'],
    default: 'PENDING',
  },
  subtotal:      { type: Number, required: true },
  serviceFee:    { type: Number, default: 0 },
  insurance:     { type: Number, default: 0 },
  totalAmount:   { type: Number, required: true },
  paymentMethod: String,
  items:         [orderItemSchema],
}, { timestamps: true });

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
