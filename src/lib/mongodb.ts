let client: MongoClient | null = null
let db: Db | null = null

const MONGODB_URI = import.meta.env.VITE_MONGODB_URI
const DB_NAME = import.meta.env.VITE_DB_NAME || 'propinspect'

// Check if MongoDB is properly configured
export const isMongoDBConfigured = () => {
  return MONGODB_URI && 
         MONGODB_URI !== 'your-mongodb-connection-string' &&
         MONGODB_URI.startsWith('mongodb')
}

export async function connectToDatabase() {
  if (!isMongoDBConfigured()) {
    console.log('MongoDB not configured, using sample data')
    return { client: null, db: null }
  }

  if (client && db) {
    return { client, db }
  }

  try {
    const { MongoClient } = await import('mongodb')
    client = new MongoClient(MONGODB_URI!)
    await client.connect()
    db = client.db(DB_NAME)
    
    console.log('Connected to MongoDB')
    return { client, db }
  } catch (error) {
    console.warn('Failed to connect to MongoDB, falling back to sample data:', error)
    return { client: null, db: null }
  }
}

export async function getDatabase() {
  if (!isMongoDBConfigured()) {
    return null
  }

  if (!db) {
    const connection = await connectToDatabase()
    return connection.db
  }
  return db
}

export async function closeConnection() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

// Database collections
export const Collections = {
  PROPERTIES: 'properties',
  CLIENTS: 'clients',
  AGENTS: 'agents',
  INSPECTIONS: 'inspections',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  USERS: 'users'
}