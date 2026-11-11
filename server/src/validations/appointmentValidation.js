const Joi = require('joi');

const appointmentValidation = (data) => {
  const schema = Joi.object({
    serviceId: Joi.string().hex().length(24).required(),
    appointmentDate: Joi.date().iso().greater('now').required(),
    address: Joi.string().min(5).required(),
    notes: Joi.string().allow('', null),
  });
  return schema.validate(data);
};

module.exports = { appointmentValidation };