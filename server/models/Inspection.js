const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: false
  },
  inspectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: Date,
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  inspectionType: {
    type: String,
    enum: ['pre-purchase', 'pre-sale', 'routine', 'insurance', 'maintenance'],
    required: true
  },
  findings: [{
    category: {
      type: String,
      enum: ['structural', 'electrical', 'plumbing', 'hvac', 'exterior', 'interior', 'safety']
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    recommendation: String,
    estimatedCost: Number
  }],
  overallRating: {
    type: Number,
    min: 1,
    max: 10
  },
  summary: String,
  recommendations: [String],
  photos: [String], // Array of photo URLs
  documents: [String], // Array of document URLs
  // Store names directly for easier display
  property_name: {
    type: String,
    default: ''
  },
  client_name: {
    type: String,
    default: ''
  },
  inspector_name: {
    type: String,
    default: ''
  },
  // Client contact information
  client_email: {
    type: String,
    default: ''
  },
  client_phone: {
    type: String,
    default: ''
  },
  client_address: {
    type: String,
    default: ''
  },
  // Property details
  property_type: {
    type: String,
    default: ''
  },
  property_size: {
    type: String,
    default: ''
  },
  // Inspector contact information
  inspector_email: {
    type: String,
    default: ''
  },
  inspector_phone: {
    type: String,
    default: ''
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

const Inspection = mongoose.model('Inspection', inspectionSchema);

module.exports = {
  model: Inspection,
  schema: inspectionSchema
};
