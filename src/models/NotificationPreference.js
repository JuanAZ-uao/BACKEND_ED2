const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  userId:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  emailConcertsNearby: { type: Boolean, default: true },
  emailPurchaseConfirm:{ type: Boolean, default: true },
  emailEventReminders: { type: Boolean, default: true },
  emailOffers:         { type: Boolean, default: false },
  pushTicketUpdates:   { type: Boolean, default: true },
  pushPriceAlerts:     { type: Boolean, default: false },
  smsPurchaseConfirm:  { type: Boolean, default: true },
  smsSecurityAlerts:   { type: Boolean, default: true },
});

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
