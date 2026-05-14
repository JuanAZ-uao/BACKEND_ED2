const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  orderId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  row:          String,
  seatLabel:    String,
  ticketCode:   { type: String, required: true, unique: true },
  qrCode:       { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'SOLD', 'USED', 'CANCELLED'],
    default: 'AVAILABLE',
  },
  usedAt: Date,
}, { timestamps: true });

ticketSchema.index({ ticketTypeId: 1, status: 1 });
ticketSchema.index({ orderId: 1 });
ticketSchema.index({ userId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
