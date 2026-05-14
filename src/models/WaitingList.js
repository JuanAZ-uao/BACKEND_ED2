const mongoose = require('mongoose');

const waitingListSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  concertId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Concert', required: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  quantity:     { type: Number, default: 1 },
  position:     { type: Number, required: true },
}, { timestamps: true });

waitingListSchema.index({ userId: 1, ticketTypeId: 1 }, { unique: true });
waitingListSchema.index({ ticketTypeId: 1, position: 1 });

module.exports = mongoose.model('WaitingList', waitingListSchema);
