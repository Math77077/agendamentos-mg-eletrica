const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service is required'],
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date and time are required'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    phone: {
    type: String,
    required: [true, 'Phone is required for confirme appointment'],
    trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required for installation or technical visit'],
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);