const Joi = require('joi');

const appointmentValidation = (data) => {
  const schema = Joi.object({
    serviceId: Joi.string().hex().length(24).required(),
    appointmentDate: Joi.date().iso().greater('now').required(),
    name: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/).required(),
    address: Joi.string().min(5).required(),
    notes: Joi.string().allow('', null),
  });
  return schema.validate(data);
};

const appointmentUpdateValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/).required(),
    address: Joi.string().trim().min(5).required(),
    appointmentDate: Joi.date().iso().required(),
  });
  return schema.validate(data);
};

module.exports = { appointmentValidation, appointmentUpdateValidation };