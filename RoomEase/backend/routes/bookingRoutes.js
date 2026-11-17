const express = require('express');
const {
  createBooking,
  listBookings,
  cancelBooking,
  updateBookingStatus
} = require('../controllers/bookingController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', listBookings);
router.post('/', createBooking);
router.patch('/:id/cancel', cancelBooking);
router.patch('/:id/status', requireAdmin, updateBookingStatus);

module.exports = router;