const fs = require('fs').promises;
const path = require('path');

class JsonFileService {
  constructor() {
    this.propertiesFilePath = path.join(__dirname, '..', 'data', 'properties.json');
    this.dataDir = path.dirname(this.propertiesFilePath);
  }

  /**
   * Ensure the data directory exists
   */
  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch (error) {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log('Created data directory:', this.dataDir);
    }
  }

  /**
   * Read the properties.json file
   */
  async readPropertiesFile() {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.propertiesFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty structure
        return {
          properties: [],
          lastUpdated: new Date().toISOString(),
          totalCount: 0
        };
      }
      throw error;
    }
  }

  /**
   * Write to the properties.json file
   */
  async writePropertiesFile(data) {
    try {
      await this.ensureDataDirectory();
      
      const jsonData = {
        properties: data.properties || [],
        lastUpdated: new Date().toISOString(),
        totalCount: data.properties ? data.properties.length : 0,
        metadata: {
          version: '1.0',
          description: 'Properties data exported from PropInspection system'
        }
      };

      await fs.writeFile(
        this.propertiesFilePath, 
        JSON.stringify(jsonData, null, 2), 
        'utf8'
      );
      
      console.log(`Updated properties.json with ${jsonData.totalCount} properties`);
      return jsonData;
    } catch (error) {
      console.error('Error writing properties.json:', error);
      throw error;
    }
  }

  /**
   * Add a new property to the JSON file
   */
  async addProperty(property) {
    try {
      const data = await this.readPropertiesFile();
      
      // Add the new property
      data.properties.push(property);
      
      return await this.writePropertiesFile(data);
    } catch (error) {
      console.error('Error adding property to JSON:', error);
      throw error;
    }
  }

  /**
   * Update an existing property in the JSON file
   */
  async updateProperty(propertyId, updatedProperty) {
    try {
      const data = await this.readPropertiesFile();
      
      // Find and update the property
      const propertyIndex = data.properties.findIndex(p => p._id === propertyId);
      if (propertyIndex !== -1) {
        data.properties[propertyIndex] = updatedProperty;
        return await this.writePropertiesFile(data);
      } else {
        console.warn(`Property with ID ${propertyId} not found in JSON file`);
        return data;
      }
    } catch (error) {
      console.error('Error updating property in JSON:', error);
      throw error;
    }
  }

  /**
   * Remove a property from the JSON file
   */
  async removeProperty(propertyId) {
    try {
      const data = await this.readPropertiesFile();
      
      // Remove the property
      data.properties = data.properties.filter(p => p._id !== propertyId);
      
      return await this.writePropertiesFile(data);
    } catch (error) {
      console.error('Error removing property from JSON:', error);
      throw error;
    }
  }

  /**
   * Sync all properties from database to JSON file
   */
  async syncAllProperties(properties) {
    try {
      const data = {
        properties: properties,
        lastUpdated: new Date().toISOString(),
        totalCount: properties.length
      };
      
      return await this.writePropertiesFile(data);
    } catch (error) {
      console.error('Error syncing all properties to JSON:', error);
      throw error;
    }
  }

  /**
   * Get the file path for external access
   */
  getFilePath() {
    return this.propertiesFilePath;
  }

  /**
   * Check if the JSON file exists
   */
  async fileExists() {
    try {
      await fs.access(this.propertiesFilePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new JsonFileService();
