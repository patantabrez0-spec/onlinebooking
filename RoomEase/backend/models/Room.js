const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    pricePerNight: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1, max: 30 },
    imageUrl: { type: String, default: '', trim: true, maxlength: 2000 },
    amenities: { type: [String], default: [] },
    available: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);