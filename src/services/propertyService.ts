import { getDatabase, isMongoDBConfigured, Collections } from '../lib/mongodb'
import { Property } from '../types/database'
import { sampleProperties } from '../data/sampleData'

export class PropertyService {
  static async getAllProperties(): Promise<Property[]> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleProperties
      }

      const db = await getDatabase()
      if (!db) {
        return sampleProperties
      }

      const properties = await db.collection(Collections.PROPERTIES)
        .find({})
        .sort({ created_at: -1 })
        .toArray()
      
      return properties.map(prop => ({
        ...prop,
        _id: prop._id.toString()
      })) as Property[]
    } catch (error) {
      console.error('Error fetching properties, using sample data:', error)
      return sampleProperties
    }
  }

  static async getPropertyById(id: string): Promise<Property | null> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleProperties.find(p => p._id === id) || null
      }

      const db = await getDatabase()
      if (!db) {
        return sampleProperties.find(p => p._id === id) || null
      }

      const property = await db.collection(Collections.PROPERTIES)
        .findOne({ _id: id })
      
      return property ? { ...property, _id: property._id.toString() } as Property : null
    } catch (error) {
      console.error('Error fetching property, using sample data:', error)
      return sampleProperties.find(p => p._id === id) || null
    }
  }

  static async createProperty(property: Omit<Property, '_id' | 'created_at' | 'updated_at'>): Promise<Property | null> {
    try {
      if (!isMongoDBConfigured()) {
        const newProperty: Property = {
          ...property,
          _id: Date.now().toString(),
          created_at: new Date(),
          updated_at: new Date()
        }
        sampleProperties.unshift(newProperty)
        return newProperty
      }

      const db = await getDatabase()
      if (!db) {
        const newProperty: Property = {
          ...property,
          _id: Date.now().toString(),
          created_at: new Date(),
          updated_at: new Date()
        }
        sampleProperties.unshift(newProperty)
        return newProperty
      }

      const now = new Date()
      const newProperty = {
        ...property,
        created_at: now,
        updated_at: now
      }

      const result = await db.collection(Collections.PROPERTIES)
        .insertOne(newProperty)
      
      return {
        ...newProperty,
        _id: result.insertedId.toString()
      } as Property
    } catch (error) {
      console.error('Error creating property:', error)
      return null
    }
  }

  static async updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
    try {
      if (!isMongoDBConfigured()) {
        const index = sampleProperties.findIndex(p => p._id === id)
        if (index !== -1) {
          sampleProperties[index] = { ...sampleProperties[index], ...updates, updated_at: new Date() }
          return sampleProperties[index]
        }
        return null
      }

      const db = await getDatabase()
      if (!db) {
        const index = sampleProperties.findIndex(p => p._id === id)
        if (index !== -1) {
          sampleProperties[index] = { ...sampleProperties[index], ...updates, updated_at: new Date() }
          return sampleProperties[index]
        }
        return null
      }

      const result = await db.collection(Collections.PROPERTIES)
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
      
      return result.value ? { ...result.value, _id: result.value._id.toString() } as Property : null
    } catch (error) {
      console.error('Error updating property:', error)
      return null
    }
  }

  static async deleteProperty(id: string): Promise<boolean> {
    try {
      if (!isMongoDBConfigured()) {
        const index = sampleProperties.findIndex(p => p._id === id)
        if (index !== -1) {
          sampleProperties.splice(index, 1)
          return true
        }
        return false
      }

      const db = await getDatabase()
      if (!db) {
        const index = sampleProperties.findIndex(p => p._id === id)
        if (index !== -1) {
          sampleProperties.splice(index, 1)
          return true
        }
        return false
      }

      const result = await db.collection(Collections.PROPERTIES)
        .deleteOne({ _id: id })
      
      return result.deletedCount > 0
    } catch (error) {
      console.error('Error deleting property:', error)
      return false
    }
  }

  static async searchProperties(query: string): Promise<Property[]> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleProperties.filter(property =>
          property.title.toLowerCase().includes(query.toLowerCase()) ||
          property.address.toLowerCase().includes(query.toLowerCase()) ||
          property.city.toLowerCase().includes(query.toLowerCase()) ||
          property.property_type.toLowerCase().includes(query.toLowerCase())
        )
      }

      const db = await getDatabase()
      if (!db) {
        return sampleProperties.filter(property =>
          property.title.toLowerCase().includes(query.toLowerCase()) ||
          property.address.toLowerCase().includes(query.toLowerCase()) ||
          property.city.toLowerCase().includes(query.toLowerCase()) ||
          property.property_type.toLowerCase().includes(query.toLowerCase())
        )
      }

      const properties = await db.collection(Collections.PROPERTIES)
        .find({
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { address: { $regex: query, $options: 'i' } },
            { city: { $regex: query, $options: 'i' } },
            { property_type: { $regex: query, $options: 'i' } }
          ]
        })
        .sort({ created_at: -1 })
        .toArray()
      
      return properties.map(prop => ({
        ...prop,
        _id: prop._id.toString()
      })) as Property[]
    } catch (error) {
      console.error('Error searching properties, using sample data:', error)
      return sampleProperties.filter(property =>
        property.title.toLowerCase().includes(query.toLowerCase()) ||
        property.address.toLowerCase().includes(query.toLowerCase()) ||
        property.city.toLowerCase().includes(query.toLowerCase()) ||
        property.property_type.toLowerCase().includes(query.toLowerCase())
      )
    }
  }
}