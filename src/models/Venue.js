const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  capacity:    { type: Number, required: true },
  description: String,
  color:       String,
});

const venueSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  address:  { type: String, required: true },
  city:     { type: String, required: true },
  country:  { type: String, default: 'Colombia' },
  imageUrl: String,
  sections: [sectionSchema],
});

module.exports = mongoose.model('Venue', venueSchema);
