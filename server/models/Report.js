const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  report_type: {
    type: String,
    required: true,
    enum: ['inspection', 'defect', 'summary', 'agreement']
  },
  property_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  agent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['Draft', 'Completed', 'Sent'],
    default: 'Draft'
  },
  generated_at: {
    type: Date,
    default: Date.now
  },
  generated_by: {
    type: String,
    required: true
  },
  // Store names directly for easier display
  property_name: {
    type: String,
    default: ''
  },
  client_name: {
    type: String,
    default: ''
  },
  agent_name: {
    type: String,
    default: ''
  },
  // Store emails for easy access
  agent_email: {
    type: String,
    default: ''
  },
  client_email: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updated_at field before saving
reportSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const Report = mongoose.model('Report', reportSchema);

module.exports = {
  model: Report,
  schema: reportSchema
};
