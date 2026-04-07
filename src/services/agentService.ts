import { getDatabase, isMongoDBConfigured, Collections } from '../lib/mongodb'
import { Agent } from '../types/database'
import { sampleAgents } from '../data/sampleData'

export class AgentService {
  static async getAllAgents(): Promise<Agent[]> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleAgents
      }

      const db = await getDatabase()
      if (!db) {
        return sampleAgents
      }

      const agents = await db.collection(Collections.AGENTS)
        .find({})
        .sort({ created_at: -1 })
        .toArray()
      
      return agents.map(agent => ({
        ...agent,
        _id: agent._id.toString()
      })) as Agent[]
    } catch (error) {
      console.error('Error fetching agents, using sample data:', error)
      return sampleAgents
    }
  }

  static async getAgentById(id: string): Promise<Agent | null> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleAgents.find(a => a._id === id) || null
      }

      const db = await getDatabase()
      if (!db) {
        return sampleAgents.find(a => a._id === id) || null
      }

      const agent = await db.collection(Collections.AGENTS)
        .findOne({ _id: id })
      
      return agent ? { ...agent, _id: agent._id.toString() } as Agent : null
    } catch (error) {
      console.error('Error fetching agent, using sample data:', error)
      return sampleAgents.find(a => a._id === id) || null
    }
  }

  static async createAgent(agent: Omit<Agent, '_id' | 'created_at' | 'updated_at'>): Promise<Agent | null> {
    try {
      if (!isMongoDBConfigured()) {
        const newAgent: Agent = {
          ...agent,
          _id: Date.now().toString(),
          created_at: new Date(),
          updated_at: new Date()
        }
        sampleAgents.unshift(newAgent)
        return newAgent
      }

      const db = await getDatabase()
      if (!db) {
        const newAgent: Agent = {
          ...agent,
          _id: Date.now().toString(),
          created_at: new Date(),
          updated_at: new Date()
        }
        sampleAgents.unshift(newAgent)
        return newAgent
      }

      const now = new Date()
      const newAgent = {
        ...agent,
        created_at: now,
        updated_at: now
      }

      const result = await db.collection(Collections.AGENTS)
        .insertOne(newAgent)
      
      return {
        ...newAgent,
        _id: result.insertedId.toString()
      } as Agent
    } catch (error) {
      console.error('Error creating agent:', error)
      return null
    }
  }

  static async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
    try {
      if (!isMongoDBConfigured()) {
        const index = sampleAgents.findIndex(a => a._id === id)
        if (index !== -1) {
          sampleAgents[index] = { ...sampleAgents[index], ...updates, updated_at: new Date() }
          return sampleAgents[index]
        }
        return null
      }

      const db = await getDatabase()
      if (!db) {
        const index = sampleAgents.findIndex(a => a._id === id)
        if (index !== -1) {
          sampleAgents[index] = { ...sampleAgents[index], ...updates, updated_at: new Date() }
          return sampleAgents[index]
        }
        return null
      }

      const result = await db.collection(Collections.AGENTS)
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
      
      return result.value ? { ...result.value, _id: result.value._id.toString() } as Agent : null
    } catch (error) {
      console.error('Error updating agent:', error)
      return null
    }
  }

  static async deleteAgent(id: string): Promise<boolean> {
    try {
      if (!isMongoDBConfigured()) {
        const index = sampleAgents.findIndex(a => a._id === id)
        if (index !== -1) {
          sampleAgents.splice(index, 1)
          return true
        }
        return false
      }

      const db = await getDatabase()
      if (!db) {
        const index = sampleAgents.findIndex(a => a._id === id)
        if (index !== -1) {
          sampleAgents.splice(index, 1)
          return true
        }
        return false
      }

      const result = await db.collection(Collections.AGENTS)
        .deleteOne({ _id: id })
      
      return result.deletedCount > 0
    } catch (error) {
      console.error('Error deleting agent:', error)
      return false
    }
  }

  static async getAvailableAgents(): Promise<Agent[]> {
    try {
      if (!isMongoDBConfigured()) {
        return sampleAgents.filter(agent => 
          ['Active', 'Busy'].includes(agent.status) && agent.workload < 20
        ).sort((a, b) => a.workload - b.workload || b.rating - a.rating)
      }

      const db = await getDatabase()
      if (!db) {
        return sampleAgents.filter(agent => 
          ['Active', 'Busy'].includes(agent.status) && agent.workload < 20
        ).sort((a, b) => a.workload - b.workload || b.rating - a.rating)
      }

      const agents = await db.collection(Collections.AGENTS)
        .find({ 
          status: { $in: ['Active', 'Busy'] },
          workload: { $lt: 20 }
        })
        .sort({ workload: 1, rating: -1 })
        .toArray()
      
      return agents.map(agent => ({
        ...agent,
        _id: agent._id.toString()
      })) as Agent[]
    } catch (error) {
      console.error('Error fetching available agents, using sample data:', error)
      return sampleAgents.filter(agent => 
        ['Active', 'Busy'].includes(agent.status) && agent.workload < 20
      ).sort((a, b) => a.workload - b.workload || b.rating - a.rating)
    }
  }
}