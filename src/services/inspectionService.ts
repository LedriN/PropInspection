import { getDatabase, Collections } from '../lib/mongodb'
import { Inspection } from '../types/database'

export class InspectionService {
  static async getAllInspections(): Promise<Inspection[]> {
    try {
      const db = await getDatabase()
      const inspections = await db.collection(Collections.INSPECTIONS)
        .find({})
        .sort({ scheduled_date: -1 })
        .toArray()
      
      return inspections.map(inspection => ({
        ...inspection,
        _id: inspection._id.toString()
      })) as Inspection[]
    } catch (error) {
      console.error('Error fetching inspections:', error)
      return []
    }
  }

  static async getInspectionById(id: string): Promise<Inspection | null> {
    try {
      const db = await getDatabase()
      const inspection = await db.collection(Collections.INSPECTIONS)
        .findOne({ _id: id })
      
      return inspection ? { ...inspection, _id: inspection._id.toString() } as Inspection : null
    } catch (error) {
      console.error('Error fetching inspection:', error)
      return null
    }
  }

  static async createInspection(inspection: Omit<Inspection, '_id' | 'created_at' | 'updated_at'>): Promise<Inspection | null> {
    try {
      const db = await getDatabase()
      const now = new Date()
      
      const newInspection = {
        ...inspection,
        created_at: now,
        updated_at: now
      }

      const result = await db.collection(Collections.INSPECTIONS)
        .insertOne(newInspection)
      
      return {
        ...newInspection,
        _id: result.insertedId.toString()
      } as Inspection
    } catch (error) {
      console.error('Error creating inspection:', error)
      return null
    }
  }

  static async updateInspection(id: string, updates: Partial<Inspection>): Promise<Inspection | null> {
    try {
      const db = await getDatabase()
      
      const result = await db.collection(Collections.INSPECTIONS)
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
      
      return result.value ? { ...result.value, _id: result.value._id.toString() } as Inspection : null
    } catch (error) {
      console.error('Error updating inspection:', error)
      return null
    }
  }

  static async deleteInspection(id: string): Promise<boolean> {
    try {
      const db = await getDatabase()
      const result = await db.collection(Collections.INSPECTIONS)
        .deleteOne({ _id: id })
      
      return result.deletedCount > 0
    } catch (error) {
      console.error('Error deleting inspection:', error)
      return false
    }
  }

  static async getInspectionsByDate(date: Date): Promise<Inspection[]> {
    try {
      const db = await getDatabase()
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const inspections = await db.collection(Collections.INSPECTIONS)
        .find({
          scheduled_date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        })
        .sort({ scheduled_time: 1 })
        .toArray()
      
      return inspections.map(inspection => ({
        ...inspection,
        _id: inspection._id.toString()
      })) as Inspection[]
    } catch (error) {
      console.error('Error fetching inspections by date:', error)
      return []
    }
  }

  static async getUpcomingInspections(limit: number = 10): Promise<Inspection[]> {
    try {
      const db = await getDatabase()
      const now = new Date()
      
      const inspections = await db.collection(Collections.INSPECTIONS)
        .find({
          scheduled_date: { $gte: now },
          status: { $in: ['scheduled', 'in-progress'] }
        })
        .sort({ scheduled_date: 1 })
        .limit(limit)
        .toArray()
      
      return inspections.map(inspection => ({
        ...inspection,
        _id: inspection._id.toString()
      })) as Inspection[]
    } catch (error) {
      console.error('Error fetching upcoming inspections:', error)
      return []
    }
  }
}