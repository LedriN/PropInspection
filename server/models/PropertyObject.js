const mongoose = require('mongoose');

const propertyObjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: 'Switzerland' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const PropertyObject = mongoose.model('PropertyObject', propertyObjectSchema);

module.exports = {
  model: PropertyObject,
  schema: propertyObjectSchema
};

