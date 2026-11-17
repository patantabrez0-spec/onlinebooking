const mongoose = require('mongoose');
const Room = require('../models/Room');

function validImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateRoom(body) {
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const pricePerNight = Number(body.pricePerNight);
  const capacity = Number(body.capacity);
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const amenities = Array.isArray(body.amenities)
    ? body.amenities.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 20)
    : [];

  if (!name || name.length > 100) return { error: 'Room name is required and must be at most 100 characters.' };
  if (!description || description.length > 2000) return { error: 'Description is required and must be at most 2,000 characters.' };
  if (!location || location.length > 120) return { error: 'Location is required and must be at most 120 characters.' };
  if (body.pricePerNight === undefined || body.pricePerNight === null || String(body.pricePerNight).trim() === '' || !Number.isFinite(pricePerNight) || pricePerNight < 0) {
    return { error: 'Price must be a non-negative number.' };
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) return { error: 'Capacity must be between 1 and 30.' };
  if (!validImageUrl(imageUrl)) return { error: 'Image URL must use http or https.' };

  return { value: { name, description, location, pricePerNight, capacity, imageUrl, amenities } };
}

async function listRooms(req, res, next) {
  try {
    const filter = { available: true };
    if (req.query.location) {
      const location = String(req.query.location).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.location = { $regex: location, $options: 'i' };
    }
    if (req.query.guests) {
      const guests = Number(req.query.guests);
      if (!Number.isInteger(guests) || guests < 1 || guests > 30) {
        return res.status(400).json({ message: 'Guests must be between 1 and 30.' });
      }
      filter.capacity = { $gte: guests };
    }
    if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
      const maxPrice = Number(req.query.maxPrice);
      if (!Number.isFinite(maxPrice) || maxPrice < 0) {
        return res.status(400).json({ message: 'Maximum price must be a non-negative number.' });
      }
      filter.pricePerNight = { $lte: maxPrice };
    }
    const rooms = await Room.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json({ rooms });
  } catch (error) {
    return next(error);
  }
}

async function listAdminRooms(req, res, next) {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 }).limit(200);
    return res.json({ rooms });
  } catch (error) {
    return next(error);
  }
}

async function getRoom(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid room ID.' });
    }
    const room = await Room.findOne({ _id: req.params.id, available: true });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    return res.json({ room });
  } catch (error) {
    return next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const result = validateRoom(req.body);
    if (result.error) return res.status(400).json({ message: result.error });
    const room = await Room.create(result.value);
    return res.status(201).json({ room });
  } catch (error) {
    return next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid room ID.' });
    }
    const result = validateRoom(req.body);
    if (result.error) return res.status(400).json({ message: result.error });
    const room = await Room.findByIdAndUpdate(req.params.id, { ...result.value, available: true }, {
      new: true,
      runValidators: true
    });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    return res.json({ room });
  } catch (error) {
    return next(error);
  }
}

async function deleteRoom(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid room ID.' });
    }
    const room = await Room.findByIdAndUpdate(req.params.id, { available: false }, { new: true });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    return res.json({ message: 'Room removed from listings.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listRooms, listAdminRooms, getRoom, createRoom, updateRoom, deleteRoom };
