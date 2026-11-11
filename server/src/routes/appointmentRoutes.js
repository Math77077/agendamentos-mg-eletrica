const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  cancelAppointment,
} = require('../controllers/appointmentController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

router.post('/', protect, createAppointment);
router.get('/my', protect, getMyAppointments);
router.patch('/:id/cancel', protect, cancelAppointment);

router.get('/', protect, isAdmin, getAllAppointments);
router.patch('/:id/status', protect, isAdmin, updateAppointmentStatus);

module.exports = router;