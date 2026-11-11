const Service = require('../models/Service');
const { serviceValidation } = require('../validations/serviceValidation');

const getServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true });
    res.status(200).json(services);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createService = async (req, res) => {
  try {
    const { error } = serviceValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { title, description, durationMinutes, price, isActive } = req.body;

    const service = await Service.create({
      title,
      description,
      durationMinutes,
      price,
      isActive,
    });

    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateService = async (req, res) => {
  try {
    const { error } = serviceValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedService);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    await service.deleteOne();
    res.status(200).json({ message: 'Service removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};