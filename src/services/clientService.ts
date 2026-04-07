import { getDatabase, isMongoDBConfigured, Collections } from '../lib/mongodb'
import { Client } from '../types/database'
import { sampleClients } from '../data/sampleData'

export class ClientService {
  static async getAllClients(): Promise<Client[]> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleClients
      }

      const db = await getDatabase()
      if (!db) {
        return sampleClients
      }

      const clients = await db.collection(Collections.CLIENTS)
        .find({})
        .sort({ created_at: -1 })
        .toArray()
      
      return clients.map(client => ({
        ...client,
        _id: client._id.toString()
      })) as Client[]
    } catch (error) {
      console.error('Error fetching clients, using sample data:', error)
      return sampleClients
    }
  }

  static async getClientById(id: string): Promise<Client | null> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleClients.find(c => c._id === id) || null
      }

      const db = await getDatabase()
      if (!db) {
        return sampleClients.find(c => c._id === id) || null
      }

      const client = await db.collection(Collections.CLIENTS)
        .findOne({ _id: id })
      
      return client ? { ...client, _id: client._id.toString() } as Client : null
    } catch (error) {
      console.error('Error fetching client, using sample data:', error)
      return sampleClients.find(c => c._id === id) || null
    }
  }

  static async createClient(client: Omit<Client, '_id' | 'created_at' | 'updated_at'>): Promise<Client | null> {
    try {
      if (!isMongoDBConfigured()) {
        const newClient: Client = {
          ...client,
          _id: Date.now().toString(),
          created_at: new Date(),
          updated_at: new Date()
        }
        sampleClients.unshift(newClient)
        return newClient
      }

      const db = await getDatabase()
      if (!db) {
        const newClient: Client = {
          ...client,
          _id: Date.now().toString(),
          created_at: new Date(),
          updated_at: new Date()
        }
        sampleClients.unshift(newClient)
        return newClient
      }

      const now = new Date()
      const newClient = {
        ...client,
        created_at: now,
        updated_at: now
      }

      const result = await db.collection(Collections.CLIENTS)
        .insertOne(newClient)
      
      return {
        ...newClient,
        _id: result.insertedId.toString()
      } as Client
    } catch (error) {
      console.error('Error creating client:', error)
      return null
    }
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    try {
      if (!isMongoDBConfigured()) {
        const index = sampleClients.findIndex(c => c._id === id)
        if (index !== -1) {
          sampleClients[index] = { ...sampleClients[index], ...updates, updated_at: new Date() }
          return sampleClients[index]
        }
        return null
      }

      const db = await getDatabase()
      if (!db) {
        const index = sampleClients.findIndex(c => c._id === id)
        if (index !== -1) {
          sampleClients[index] = { ...sampleClients[index], ...updates, updated_at: new Date() }
          return sampleClients[index]
        }
        return null
      }

      const result = await db.collection(Collections.CLIENTS)
        .findOneAndUpdate(
          { _id: id },
          { 
            $set: { 
              ...updates, 
              updated_at: new Date() 
            } 
          },
          { returnDocument: 'after' }
        )
      
      return result.value ? { ...result.value, _id: result.value._id.toString() } as Client : null
    } catch (error) {
      console.error('Error updating client:', error)
      return null
    }
  }

  static async deleteClient(id: string): Promise<boolean> {
    try {
      if (!isMongoDBConfigured()) {
        const index = sampleClients.findIndex(c => c._id === id)
        if (index !== -1) {
          sampleClients.splice(index, 1)
          return true
        }
        return false
      }

      const db = await getDatabase()
      if (!db) {
        const index = sampleClients.findIndex(c => c._id === id)
        if (index !== -1) {
          sampleClients.splice(index, 1)
          return true
        }
        return false
      }

      const result = await db.collection(Collections.CLIENTS)
        .deleteOne({ _id: id })
      
      return result.deletedCount > 0
    } catch (error) {
      console.error('Error deleting client:', error)
      return false
    }
  }

  static async searchClients(query: string): Promise<Client[]> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleClients.filter(client =>
          `${client.firstName} ${client.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
          client.email.toLowerCase().includes(query.toLowerCase()) ||
          client.phone.includes(query)
        )
      }

      const db = await getDatabase()
      if (!db) {
        return sampleClients.filter(client =>
          `${client.firstName} ${client.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
          client.email.toLowerCase().includes(query.toLowerCase()) ||
          client.phone.includes(query)
        )
      }

      const clients = await db.collection(Collections.CLIENTS)
        .find({
          $or: [
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } }
          ]
        })
        .sort({ created_at: -1 })
        .toArray()
      
      return clients.map(client => ({
        ...client,
        _id: client._id.toString()
      })) as Client[]
    } catch (error) {
      console.error('Error searching clients, using sample data:', error)
      return sampleClients.filter(client =>
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
        client.email.toLowerCase().includes(query.toLowerCase()) ||
        client.phone.includes(query)
      )
    }
  }
}