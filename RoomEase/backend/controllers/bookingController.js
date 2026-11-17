const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

async function createBooking(req, res, next) {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const roomId = body.roomId;
    const checkIn = parseDateOnly(body.checkIn);
    const checkOut = parseDateOnly(body.checkOut);
    const guests = Number(body.guests);

    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({ message: 'Choose a valid room.' });
    }
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      return res.status(400).json({ message: 'Choose valid check-in and check-out dates.' });
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (checkIn < today) {
      return res.status(400).json({ message: 'Check-in cannot be in the past.' });
    }
    if (!Number.isInteger(guests) || guests < 1 || guests > 30) {
      return res.status(400).json({ message: 'Guests must be between 1 and 30.' });
    }

    const room = await Room.findOne({ _id: roomId, available: true });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    if (guests > room.capacity) {
      return res.status(400).json({ message: `This room allows up to ${room.capacity} guests.` });
    }

    const conflict = await Booking.exists({
      room: room._id,
      status: { $ne: 'cancelled' },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn }
    });
    if (conflict) {
      return res.status(409).json({ message: 'This room is not available for those dates.' });
    }

    const nights = (checkOut.getTime() - checkIn.getTime()) / 86400000;
    const totalPrice = Math.round(room.pricePerNight * nights * 100) / 100;
    if (!Number.isFinite(totalPrice)) {
      return res.status(400).json({ message: 'The booking total is too large.' });
    }
    const booking = await Booking.create({
      user: req.user._id,
      room: room._id,
      checkIn,
      checkOut,
      guests,
      totalPrice
    });
    await booking.populate('room', 'name location imageUrl pricePerNight');
    return res.status(201).json({ booking });
  } catch (error) {
    return next(error);
  }
}

async function listBookings(req, res, next) {
  try {
    const filter = req.user.role === 'admin' && req.query.all === 'true'
      ? {}
      : { user: req.user._id };
    const bookings = await Booking.find(filter)
      .populate('room', 'name location imageUrl pricePerNight')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json({ bookings });
  } catch (error) {
    return next(error);
  }
}

async function cancelBooking(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID.' });
    }
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };
    const booking = await Booking.findOne(filter);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Completed bookings cannot be cancelled.' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'This booking is already cancelled.' });
    }
    booking.status = 'cancelled';
    await booking.save();
    return res.json({ booking, message: 'Booking cancelled.' });
  } catch (error) {
    return next(error);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID.' });
    }
    const allowed = ['pending', 'confirmed', 'cancelled', 'completed'];
    const status = req.body && typeof req.body.status === 'string' ? req.body.status : '';
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Choose a valid booking status.' });
    }
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('room', 'name location imageUrl').populate('user', 'name email');
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createBooking, listBookings, cancelBooking, updateBookingStatus };
