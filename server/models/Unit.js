const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  objectId: { type: String, required: true }, // Reference to PropertyObject
  unitNumber: { type: String, required: true }, // e.g., "Unit A", "A1"
  floor: { type: String, default: '' }, // e.g., "Floor 1", "1"
  description: { type: String, default: '' },
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

const Unit = mongoose.model('Unit', unitSchema);

module.exports = {
  model: Unit,
  schema: unitSchema
};

