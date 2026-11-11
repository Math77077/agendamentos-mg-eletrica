const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const { appointmentValidation } = require('../validations/appointmentValidation');

const createAppointment = async (req, res) => {
  try {
    const { error } = appointmentValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { serviceId, appointmentDate, address, notes } = req.body;

    const serviceExists = await Service.findById(serviceId);
    if (!serviceExists || !serviceExists.isActive) {
      return res.status(404).json({ message: 'Service not found or inactive' });
    }

    const appointment = await Appointment.create({
      user: req.user.id,
      service: serviceId,
      appointmentDate,
      address,
      notes,
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email phone')
      .populate('service', 'title price durationMinutes');

    res.status(201).json(populatedAppointment);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user.id })
      .populate('service', 'title price durationMinutes')
      .sort({ appointmentDate: 1 });

    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('user', 'name email phone')
      .populate('service', 'title price durationMinutes')
      .sort({ appointmentDate: 1 });

    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = status;
    await appointment.save();

    res.status(200).json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.status(200).json({ message: 'Appointment cancelled successfully', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  cancelAppointment,
};