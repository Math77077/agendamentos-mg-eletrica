const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  getAvailability,
  getAdminAppointmentAvailability,
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
} = require('../controllers/appointmentController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

router.post('/', protect, createAppointment);
router.get('/my', protect, getMyAppointments);
router.get('/availability', getAvailability);
router.get('/availability/admin', protect, isAdmin, getAdminAppointmentAvailability);
router.patch('/:id/cancel', protect, cancelAppointment);

router.get('/', protect, isAdmin, getAllAppointments);
router.put('/:id', protect, isAdmin, updateAppointment);
router.patch('/:id/status', protect, isAdmin, updateAppointmentStatus);

module.exports = router;