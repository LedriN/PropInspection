const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  propertyType: {
    type: String,
    enum: ['Apartment', 'House', 'Condo', 'Townhouse', 'Studio', 'Commercial', 'Chalet', 'Penthouse'],
    required: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: 'Switzerland' }
  },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  size: {
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    squareFeet: { type: Number, default: 0 } // This will store m² values
  },
  rent_price: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Maintenance', 'Unavailable'],
    default: 'Available'
  },
  description: { type: String, default: '' },
  features: { type: String, default: '' },
  yearBuilt: { type: Number, default: null },
  parking: { type: String, default: '' },
  petFriendly: { type: Boolean, default: false },
  furnished: { type: Boolean, default: false },
  images: [String], // Array of image URLs
  pdf: { type: String, default: '' }, // PDF document URL
  defects: [String], // Array of reported defects
  objectId: { type: String, default: null }, // Link to PropertyObject
  unitId: { type: String, default: null }, // Link to Unit (if property belongs to a unit)
  manager: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  documents: [{
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['contract', 'document', 'other'],
      default: 'document'
    },
    url: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now }
  }],
  interventions: [{
    date: { type: Date, default: Date.now },
    type: { type: String, required: true },
    description: { type: String, default: '' },
    unitId: { type: String, default: '' },
    performedBy: { type: String, default: '' },
    cost: { type: Number, default: 0 }
  }],
  entrances: [{
    entranceName: { type: String, default: '' },
    entranceNumber: { type: String, default: '' },
    floors: [{
      floorNumber: { type: String, default: '' },
      units: [{
        unitNumber: { type: String, default: '' },
        unitType: {
          type: String,
          enum: ['apartment', 'office', 'parking', 'storage'],
          default: 'apartment'
        },
        size: { type: Number, default: 0 },
        bedrooms: { type: Number, default: 0 },
        bathrooms: { type: Number, default: 0 },
        rentPrice: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['Available', 'Occupied', 'Maintenance', 'Unavailable'],
          default: 'Available'
        },
        tenant: { type: String, default: '' },
        notes: { type: String, default: '' }
      }]
    }]
  }],
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

const Property = mongoose.model('Property', propertySchema);

module.exports = {
  model: Property,
  schema: propertySchema
};
