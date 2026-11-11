const Joi = require('joi');

const serviceValidation = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(120).required(),
    description: Joi.string().min(5).required(),
    durationMinutes: Joi.number().integer().min(15).required(),
    price: Joi.number().min(0).required(),
    isActive: Joi.boolean(),
  });
  return schema.validate(data);
};

module.exports = { serviceValidation };