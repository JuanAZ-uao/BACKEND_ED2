const mongoose = require('mongoose');

const ticketTypeSchema = new mongoose.Schema({
  concertId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Concert', required: true },
  sectionId:         { type: mongoose.Schema.Types.ObjectId, default: null },
  name:              { type: String, required: true },
  description:       String,
  price:             { type: Number, required: true },
  totalQuantity:     { type: Number, required: true },
  availableQuantity: { type: Number, required: true },
  maxPerOrder:       { type: Number, default: 8 },
});

ticketTypeSchema.index({ concertId: 1 });

module.exports = mongoose.model('TicketType', ticketTypeSchema);
