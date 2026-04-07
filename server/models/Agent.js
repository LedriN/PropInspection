const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const agentSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  databaseName: {
    type: String,
    unique: true,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'agent', 'inspector'],
    default: 'agent'
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: 'Switzerland' }
  },
  specialization: [{
    type: String,
    enum: [
      'Residential Sales',
      'Commercial Properties',
      'Luxury Properties',
      'Investment Properties',
      'New Construction',
      'Historic Properties',
      'Waterfront Properties',
      'Mountain Properties',
      'International Clients',
      'First-time Buyers'
    ]
  }],
  experience: {
    type: Number,
    default: 0 // years of experience
  },
  licenseNumber: {
    type: String,
    unique: true,
    required: false,
    default: ''
  },
  commissionRate: {
    type: Number,
    default: 0 // percentage
  },
  status: {
    type: String,
    enum: ['Active', 'Busy', 'Unavailable', 'Inactive'],
    default: 'Active',
    required: false
  },
  bio: {
    type: String,
    default: ''
  },
  languages: [{
    type: String,
    enum: ['German', 'French', 'Italian', 'English', 'Spanish', 'Portuguese', 'Russian', 'Chinese', 'Arabic']
  }],
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' }
  },
  availability: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  completed_inspections: {
    type: Number,
    default: 0
  },
  workload: {
    type: Number,
    default: 0
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

// Hash password before saving
agentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for full name
agentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

agentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const Agent = mongoose.model('Agent', agentSchema);

module.exports = {
  model: Agent,
  schema: agentSchema
};
