import { connectToDatabase, Collections } from '../lib/mongodb'

const sampleProperties = [
  {
    title: 'Modern Downtown Apartment',
    address: '123 Oak Street',
    city: 'San Francisco',
    property_type: 'Apartment',
    rent_price: 2500,
    deposit: 5000,
    bedrooms: 2,
    bathrooms: 2,
    square_feet: 1200,
    description: 'Beautiful modern apartment in the heart of downtown',
    status: 'Available',
    defects: [],
    notes: 'Recently renovated',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    title: 'Cozy Suburban House',
    address: '456 Pine Avenue',
    city: 'Oakland',
    property_type: 'House',
    rent_price: 3200,
    deposit: 6400,
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1800,
    description: 'Family-friendly house with garden',
    status: 'Occupied',
    defects: ['Minor wall damage', 'Leaky faucet'],
    notes: 'Good tenant, lease expires next year',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    title: 'Luxury Penthouse',
    address: '789 Elm Drive',
    city: 'San Francisco',
    property_type: 'Penthouse',
    rent_price: 5500,
    deposit: 11000,
    bedrooms: 3,
    bathrooms: 3,
    square_feet: 2200,
    description: 'Stunning penthouse with city views',
    status: 'Maintenance',
    defects: ['HVAC needs service'],
    notes: 'Premium property, high-end finishes',
    created_at: new Date(),
    updated_at: new Date()
  }
]

const sampleClients = [
  {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    status: 'Active',
    notes: 'Reliable tenant, always pays on time',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    first_name: 'Emma',
    last_name: 'Wilson',
    email: 'emma.wilson@email.com',
    phone: '+1 (555) 987-6543',
    status: 'Prospective',
    notes: 'Looking for 2-bedroom apartment downtown',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    first_name: 'James',
    last_name: 'Brown',
    email: 'james.brown@email.com',
    phone: '+1 (555) 456-7890',
    status: 'Former',
    notes: 'Moved out last month, good references',
    created_at: new Date(),
    updated_at: new Date()
  }
]

const sampleAgents = [
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@propinspect.com',
    phone: '+1 (555) 123-4567',
    status: 'Active',
    specialties: ['Residential', 'Commercial'],
    workload: 8,
    rating: 4.9,
    completed_inspections: 152,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    first_name: 'Mike',
    last_name: 'Davis',
    email: 'mike.davis@propinspect.com',
    phone: '+1 (555) 987-6543',
    status: 'Active',
    specialties: ['Residential', 'Safety'],
    workload: 12,
    rating: 4.7,
    completed_inspections: 89,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    first_name: 'Lisa',
    last_name: 'Chen',
    email: 'lisa.chen@propinspect.com',
    phone: '+1 (555) 456-7890',
    status: 'Busy',
    specialties: ['Commercial', 'Industrial'],
    workload: 15,
    rating: 4.8,
    completed_inspections: 203,
    created_at: new Date(),
    updated_at: new Date()
  }
]

export async function seedDatabase() {
  try {
    const { db } = await connectToDatabase()
    
    // Clear existing data
    await db.collection(Collections.PROPERTIES).deleteMany({})
    await db.collection(Collections.CLIENTS).deleteMany({})
    await db.collection(Collections.AGENTS).deleteMany({})
    
    // Insert sample data
    await db.collection(Collections.PROPERTIES).insertMany(sampleProperties)
    await db.collection(Collections.CLIENTS).insertMany(sampleClients)
    await db.collection(Collections.AGENTS).insertMany(sampleAgents)
    
    console.log('Database seeded successfully!')
    return true
  } catch (error) {
    console.error('Error seeding database:', error)
    return false
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0))
}