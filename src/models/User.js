const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  phone:     String,
  birthDate: Date,
  gender:    String,
  city:      String,
  document:  String,
  bio:       String,
  avatarUrl: String,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
