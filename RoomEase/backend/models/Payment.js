const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['card', 'cash', 'other'],
      default: 'other'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    providerReference: { type: String, trim: true, maxlength: 200 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);