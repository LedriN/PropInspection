// For now, we'll use a simple JavaScript-based storage solution
// that doesn't require native modules. This avoids the linking issues.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateObjectId, createTempId } from '../utils/objectIdUtils';

// Simple in-memory database simulation
class SimpleDatabase {
  private data: any = {
    properties: [],
    clients: [],
    agents: [],
    reports: [],
  };

  async init() {
    try {
      // Load existing data from AsyncStorage
      const storedData = await AsyncStorage.getItem('simple_database');
      if (storedData) {
        this.data = JSON.parse(storedData);
        // Restore Date objects that might have been serialized as strings
        this.restoreDateObjects();
      }
      console.log('Simple database initialized');
    } catch (error) {
      console.error('Failed to initialize simple database:', error);
    }
  }

  private restoreDateObjects() {
    // Restore Date objects for reports
    if (this.data.reports) {
      this.data.reports.forEach((report: any) => {
        if (report.generatedAt && typeof report.generatedAt === 'string') {
          report.generatedAt = new Date(report.generatedAt);
        }
        if (report.createdAt && typeof report.createdAt === 'string') {
          report.createdAt = new Date(report.createdAt);
        }
        if (report.updatedAt && typeof report.updatedAt === 'string') {
          report.updatedAt = new Date(report.updatedAt);
        }
      });
    }

    // Restore Date objects for other entities if needed
    ['properties', 'clients', 'agents'].forEach(tableName => {
      if (this.data[tableName]) {
        this.data[tableName].forEach((item: any) => {
          if (item.createdAt && typeof item.createdAt === 'string') {
            item.createdAt = new Date(item.createdAt);
          }
          if (item.updatedAt && typeof item.updatedAt === 'string') {
            item.updatedAt = new Date(item.updatedAt);
          }
        });
      }
    });
  }

  async save() {
    try {
      await AsyncStorage.setItem('simple_database', JSON.stringify(this.data));
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  // Properties
  get properties() {
    return this.data.properties;
  }

  async createProperty(propertyData: any) {
    const property = {
      id: generateObjectId(),
      ...propertyData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.properties.push(property);
    await this.save();
    return property;
  }

  // Clients
  get clients() {
    return this.data.clients;
  }

  async createClient(clientData: any) {
    const client = {
      id: generateObjectId(),
      ...clientData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.clients.push(client);
    await this.save();
    return client;
  }

  // Agents
  get agents() {
    return this.data.agents;
  }

  async createAgent(agentData: any) {
    const agent = {
      id: generateObjectId(),
      ...agentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.agents.push(agent);
    await this.save();
    return agent;
  }

  // Reports
  get reports() {
    return this.data.reports;
  }

  async createReport(reportData: any) {
    const report = {
      id: generateObjectId(),
      ...reportData,
      // Ensure generatedAt is a proper Date object
      generatedAt: reportData.generatedAt ? 
        (reportData.generatedAt instanceof Date ? 
          reportData.generatedAt : 
          new Date(reportData.generatedAt)
        ) : 
        new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.reports.push(report);
    await this.save();
    return report;
  }

  async updateReport(id: string, updates: any) {
    const index = this.data.reports.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      this.data.reports[index] = {
        ...this.data.reports[index],
        ...updates,
        updatedAt: new Date(),
      };
      await this.save();
      return this.data.reports[index];
    }
    return null;
  }

  getUnsyncedReports() {
    return this.data.reports.filter((r: any) => !r.isSynced);
  }

  // Generic CRUD methods
  async findById(table: string, id: string) {
    const records = this.data[table] || [];
    return records.find((record: any) => record.id === id || record._id === id);
  }

  async findAll(table: string, where?: string, params?: any[]) {
    let records = this.data[table] || [];
    
    // Simple where clause support (basic implementation)
    if (where && params) {
      // This is a very basic implementation - in a real app you'd want a proper query parser
      if (where.includes('=')) {
        const [field, value] = where.split('=').map(s => s.trim());
        records = records.filter((record: any) => {
          const recordValue = record[field];
          return recordValue === params[0];
        });
      }
    }
    
    return records;
  }

  async insert(table: string, data: any) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    
    const record = {
      id: data.id || generateObjectId(),
      ...data,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.data[table].push(record);
    await this.save();
    return record;
  }

  async update(table: string, id: string, updates: any) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    
    const index = this.data[table].findIndex((record: any) => record.id === id || record._id === id);
    if (index !== -1) {
      this.data[table][index] = {
        ...this.data[table][index],
        ...updates,
        updatedAt: new Date(),
      };
      await this.save();
      return this.data[table][index];
    }
    return null;
  }

  async delete(table: string, id: string) {
    if (!this.data[table]) {
      return null;
    }
    
    const index = this.data[table].findIndex((record: any) => record.id === id || record._id === id);
    if (index !== -1) {
      const deleted = this.data[table][index];
      this.data[table].splice(index, 1);
      await this.save();
      return deleted;
    }
    return null;
  }

  async query(sql: string) {
    // Very basic SQL query support for compatibility
    // This is not a real SQL parser - just for basic operations
    if (sql.includes('SELECT COUNT(*)')) {
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        return [{ count: (this.data[table] || []).length }];
      }
    }
    return [];
  }

  async execute(sql: string) {
    // Very basic SQL execution support
    if (sql.includes('DELETE FROM')) {
      const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        this.data[table] = [];
        await this.save();
      }
    }
  }
}

const database = new SimpleDatabase();

// Initialize the database
database.init();

export default database;
