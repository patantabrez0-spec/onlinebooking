const express = require('express');
const {
  listRooms,
  listAdminRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', listRooms);
router.get('/admin', authenticate, requireAdmin, listAdminRooms);
router.get('/:id', getRoom);
router.post('/', authenticate, requireAdmin, createRoom);
router.put('/:id', authenticate, requireAdmin, updateRoom);
router.delete('/:id', authenticate, requireAdmin, deleteRoom);

module.exports = router;