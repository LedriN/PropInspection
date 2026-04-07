export interface Unit {
  _id?: string
  unitNumber?: string
  unitType: 'apartment' | 'office' | 'parking' | 'storage'
  size?: number // in m²
  bedrooms?: number
  bathrooms?: number
  rentPrice?: number
  status?: 'Available' | 'Occupied' | 'Maintenance' | 'Unavailable'
  tenant?: string
  notes?: string
}

export interface Floor {
  _id?: string
  floorNumber?: string | number
  units?: Unit[]
}

export interface Entrance {
  _id?: string
  entranceName?: string
  entranceNumber?: string
  floors?: Floor[]
}

export interface BuildingUnit {
  _id?: string
  objectId: string // Reference to PropertyObject
  unitNumber: string // e.g., "Unit A", "A1", etc.
  floor?: string | number // e.g., "Floor 1", 1, etc.
  description?: string
  properties?: Property[] // Properties within this unit
  createdAt?: Date
  updatedAt?: Date
}

export interface PropertyObject {
  _id?: string
  name: string
  description?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  } | string
  units?: BuildingUnit[] // Units within this object
  properties?: Property[] // Direct properties (for backward compatibility)
  createdAt?: Date
  updatedAt?: Date
}

export interface Property {
  _id?: string
  name?: string
  title?: string
  propertyType?: string
  property_type?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  } | string
  coordinates?: {
    lat?: number | null
    lng?: number | null
  }
  city?: string
  rent_price?: number
  deposit?: number
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  size?: {
    bedrooms?: number
    bathrooms?: number
    squareFeet?: number
  }
  description?: string
  features?: string
  yearBuilt?: number
  parking?: string
  petFriendly?: boolean
  furnished?: boolean
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Unavailable'
  defects?: string[]
  notes?: string
  images?: string[]
  pdf?: string
  // Hierarchical structure
  objectId?: string // Reference to PropertyObject
  unitId?: string // Reference to BuildingUnit (if property belongs to a unit)
  entrances?: Entrance[]
  // Manager information
  manager?: {
    name?: string
    email?: string
    phone?: string
  }
  // Documents & contracts
  documents?: Array<{
    _id?: string
    name: string
    type: 'contract' | 'document' | 'other'
    url: string
    uploadDate?: Date
  }>
  // Intervention history
  interventions?: Array<{
    _id?: string
    date: Date
    type: string
    description: string
    unitId?: string
    performedBy?: string
    cost?: number
  }>
  created_at?: Date
  updated_at?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface Client {
  _id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  company?: string
  type?: 'individual' | 'business' | 'real-estate-agent' | 'insurance-company'
  status: 'active' | 'inactive' | 'prospect'
  notes?: string
  preferredContactMethod?: 'email' | 'phone' | 'text'
  createdAt?: Date
  updatedAt?: Date
}

export interface Agent {
  _id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  specialties: string[]
  workload: number
  rating: number
  completed_inspections: number
  status: 'Active' | 'Busy' | 'Unavailable' | 'Inactive'
  bio?: string
  licenseNumber?: string
  commissionRate?: number
  experience?: string
  languages?: string[]
  workingHours?: {
    start: string
    end: string
  }
  availability?: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  createdAt?: Date
  updatedAt?: Date
}

export interface Inspection {
  _id?: string
  propertyId: string
  clientId: string
  inspectorId: string
  scheduledDate: Date
  completedDate?: Date
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  inspectionType: string
  findings?: Array<{
    category: 'structural' | 'electrical' | 'plumbing' | 'hvac' | 'exterior' | 'interior' | 'safety'
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    recommendation: string
    estimatedCost: number
  }>
  overallRating?: number
  summary?: string
  recommendations?: string[]
  photos?: string[]
  documents?: string[]
  createdAt?: Date
  updatedAt?: Date
}

export interface Report {
  _id?: string
  inspection_id: string
  title: string
  report_type: string
  content: Record<string, any>
  status: 'Draft' | 'Completed' | 'Sent'
  generated_at: Date
  generated_by: string
}

export interface Notification {
  _id?: string
  user_id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: Date
}

export interface User {
  _id?: string
  email: string
  password_hash: string
  role: 'admin' | 'agent' | 'manager'
  first_name: string
  last_name: string
  created_at: Date
  updated_at: Date
}