const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  company: String,
  type: {
    type: String,
    enum: ['individual', 'business', 'real-estate-agent', 'insurance-company'],
    default: 'individual'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'prospect'],
    default: 'active'
  },
  notes: String,
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'text'],
    default: 'email'
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

// Virtual for full name
clientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

clientSchema.set('toJSON', {
  virtuals: true
});

const Client = mongoose.model('Client', clientSchema);

module.exports = {
  model: Client,
  schema: clientSchema
};
