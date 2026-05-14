const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  bio:      String,
  imageUrl: String,
  genres:   [String],
});

module.exports = mongoose.model('Artist', artistSchema);
