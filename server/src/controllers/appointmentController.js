const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const {
  appointmentValidation,
  appointmentUpdateValidation,
} = require('../validations/appointmentValidation');
const {
  ACTIVE_APPOINTMENT_STATUSES,
  BUSINESS_TIME_ZONE,
  CALENDAR_APPOINTMENT_STATUSES,
  SLOT_INTERVAL_MINUTES,
  canChangeAppointmentTime,
  dateKeyFromParts,
  getBusinessHours,
  getDurationMinutes,
  getMonthRange,
  getZonedDateParts,
  intervalsOverlap,
  isAppointmentTimeWithinBusinessHours,
  localDateTimeToDate,
  parseAppointmentDate,
} = require('../utils/appointmentAvailability');

const getAvailabilityData = async (req, res, isAdminView) => {
  try {
    const range = getMonthRange(req.query.month);
    if (!range) {
      return res.status(400).json({ message: 'A valid month in YYYY-MM format is required' });
    }

    let requestedService;
    if (req.query.serviceId) {
      if (!/^[\da-f]{24}$/i.test(req.query.serviceId)) {
        return res.status(400).json({ message: 'Invalid service ID' });
      }

      requestedService = await Service.findById(req.query.serviceId);
      if (!requestedService || (!requestedService.isActive && !isAdminView)) {
        return res.status(404).json({ message: 'Service not found or inactive' });
      }
    } else if (!isAdminView) {
      return res.status(400).json({ message: 'A service ID is required' });
    }

    const appointmentQuery = {
      status: { $in: isAdminView ? CALENDAR_APPOINTMENT_STATUSES : ACTIVE_APPOINTMENT_STATUSES },
      appointmentDate: {
        $gte: new Date(range.start.getTime() - 24 * 60 * 60 * 1000),
        $lt: range.end,
      },
    };
    const appointments = await Appointment.find(appointmentQuery)
      .select('appointmentDate service status')
      .populate('service', 'title durationMinutes')
      .lean();

    const today = dateKeyFromParts(getZonedDateParts(new Date()));
    const days = [];

    for (let day = 1; day <= range.daysInMonth; day += 1) {
      const dateKey = `${req.query.month}-${String(day).padStart(2, '0')}`;
      const hours = getBusinessHours(dateKey);
      const isPast = dateKey < today;
      const slots = [];

      if (hours) {
        for (
          let minutes = hours.opensAt;
          minutes + (requestedService?.durationMinutes || 15) <= hours.closesAt;
          minutes += SLOT_INTERVAL_MINUTES
        ) {
          const start = localDateTimeToDate(dateKey, minutes);
          if (!start) {
            continue;
          }

          const durationMinutes = requestedService?.durationMinutes || 15;
          const conflicts = appointments.filter((appointment) =>
            ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)
            && intervalsOverlap(
              start.getTime(),
              durationMinutes,
              new Date(appointment.appointmentDate).getTime(),
              getDurationMinutes(appointment)
            )
          );
          const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

          slots.push({
            time,
            appointmentDate: start.toISOString(),
            available: !isPast && start > new Date() && conflicts.length === 0,
          });
        }
      }

      const dayAppointments = appointments
        .filter((appointment) =>
          dateKeyFromParts(getZonedDateParts(new Date(appointment.appointmentDate))) === dateKey
        )
        .map((appointment) => {
          const parts = getZonedDateParts(new Date(appointment.appointmentDate));
          return {
            time: `${parts.hour}:${parts.minute}`,
            status: appointment.status,
            serviceTitle: appointment.service?.title || 'Serviço removido',
          };
        })
        .sort((first, second) => first.time.localeCompare(second.time));

      days.push({
        date: dateKey,
        isOpen: Boolean(hours),
        isPast,
        slots,
        ...(isAdminView ? { appointments: dayAppointments } : {}),
      });
    }

    res.status(200).json({
      month: req.query.month,
      timeZone: BUSINESS_TIME_ZONE,
      slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
      days,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPublicAvailability = (req, res) => getAvailabilityData(req, res, false);
const getAdminAvailability = (req, res) => getAvailabilityData(req, res, true);

const validateAppointmentAvailability = async ({
  appointmentDate,
  service,
  excludeAppointmentId,
}) => {
  if (!isAppointmentTimeWithinBusinessHours(appointmentDate, service.durationMinutes)) {
    return 'O horário escolhido está fora do expediente ou não está mais disponível.';
  }

  const durationMinutes = service.durationMinutes;
  const dayStart = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
  const query = {
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    appointmentDate: { $gte: dayStart, $lt: new Date(appointmentDate.getTime() + durationMinutes * 60000) },
  };
  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const existingAppointments = await Appointment.find(query)
    .select('appointmentDate service')
    .populate('service', 'durationMinutes')
    .lean();
  const hasConflict = existingAppointments.some((appointment) =>
    intervalsOverlap(
      appointmentDate.getTime(),
      durationMinutes,
      new Date(appointment.appointmentDate).getTime(),
      getDurationMinutes(appointment)
    )
  );

  return hasConflict ? 'O horário escolhido já está indisponível.' : null;
};

const createAppointment = async (req, res) => {
  try {
    const { error } = appointmentValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { serviceId, appointmentDate, name, phone, address, notes } = req.body;

    const serviceExists = await Service.findById(serviceId);
    if (!serviceExists || !serviceExists.isActive) {
      return res.status(404).json({ message: 'Service not found or inactive' });
    }

    const availabilityError = await validateAppointmentAvailability({
      appointmentDate: new Date(appointmentDate),
      service: serviceExists,
    });
    if (availabilityError) {
      return res.status(409).json({ message: availabilityError });
    }

    const appointment = await Appointment.create({
      user: req.user.id,
      service: serviceId,
      appointmentDate,
      name,
      phone,
      address,
      notes,
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email phone')
      .populate('service', 'title price durationMinutes');

    const io = req.app.get('io');
    if (io) {
      io.emit('appointment_created', populatedAppointment);
      io.emit('availability_changed');
    }
    
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

const getAvailability = async (req, res) => getPublicAvailability(req, res);
const getAdminAppointmentAvailability = async (req, res) => getAdminAvailability(req, res);

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

    const io = req.app.get('io');
    if (io) {
      io.emit('appointment_updated', { _id: appointment._id, status: appointment.status });
      io.emit('availability_changed');
    }

    res.status(200).json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { error } = appointmentUpdateValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const { serviceId, name, phone, address, appointmentDate } = req.body;
    const service = await Service.findById(serviceId);
    if (!service || (!service.isActive && service._id.toString() !== appointment.service.toString())) {
      return res.status(404).json({ message: 'Service not found or inactive' });
    }

    const updatedAppointmentDate = parseAppointmentDate(appointmentDate);
    if (!updatedAppointmentDate) {
      return res.status(400).json({ message: 'Invalid appointment date' });
    }
    if (!canChangeAppointmentTime(
      appointment.status,
      appointment.appointmentDate,
      updatedAppointmentDate
    )) {
      return res.status(409).json({
        message: 'Não é possível alterar a data e o horário de um agendamento cancelado ou concluído.',
      });
    }

    const scheduleIsUnchanged = service._id.toString() === appointment.service.toString()
      && Math.floor(updatedAppointmentDate.getTime() / 60000)
        === Math.floor(appointment.appointmentDate.getTime() / 60000);

    if (!scheduleIsUnchanged) {
      const availabilityError = await validateAppointmentAvailability({
        appointmentDate: updatedAppointmentDate,
        service,
        excludeAppointmentId: appointment._id,
      });
      if (availabilityError) {
        return res.status(409).json({ message: availabilityError });
      }
    }

    appointment.service = serviceId;
    appointment.name = name;
    appointment.phone = phone;
    appointment.address = address;
    appointment.appointmentDate = updatedAppointmentDate;
    await appointment.save();
    await appointment.populate('user', 'name email phone');
    await appointment.populate('service', 'title price durationMinutes');

    const io = req.app.get('io');
    if (io) {
      io.emit('appointment_updated', appointment);
      io.emit('availability_changed');
    }

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

    const io = req.app.get('io');
    if (io) {
      io.emit('appointment_updated', { _id: appointment._id, status: appointment.status });
      io.emit('availability_changed');
    }

    res.status(200).json({ message: 'Appointment cancelled successfully', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  getAvailability,
  getAdminAppointmentAvailability,
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
};