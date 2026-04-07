const { getTenantConnection, getTenantDb, getConnectionStats } = require('../db');
const mongoose = require('mongoose');

// Connection cache with TTL to prevent too many connections
const connectionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clean up expired connections every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of connectionCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION) {
      connectionCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Middleware to set user database for the request
 */
function setUserDatabase(req, res, next) {
  // Use the authenticated user's database if available, otherwise default
  if (req.user && req.user.databaseName) {
    req.userDatabase = req.user.databaseName;
  } else {
    req.userDatabase = req.userDatabase || 'propinspection_users';
  }
  next();
}

/**
 * Get models for a specific database
 */
function getUserModels(databaseName) {
  if (!databaseName) {
    throw new Error('databaseName is required');
  }

  // Use the centralized connection manager from db.js
  const connection = getTenantConnection(databaseName);
  
  // Return models using the connection
  return {
    Property: connection.model('Property', require('../models/Property').schema),
    PropertyObject: connection.model('PropertyObject', require('../models/PropertyObject').schema),
    Unit: connection.model('Unit', require('../models/Unit').schema),
    Client: connection.model('Client', require('../models/Client').schema),
    Agent: connection.model('Agent', require('../models/Agent').schema),
    Inspection: connection.model('Inspection', require('../models/Inspection').schema),
    Report: connection.model('Report', require('../models/Report').schema),
  };
}

/**
 * Centralized database connection manager
 * This replaces the individual getDatabaseConnection functions in each route
 */
class DatabaseManager {
  /**
   * Get a tenant database connection (reuses existing connections)
   */
  static getTenantConnection(databaseName) {
    if (!databaseName) {
      throw new Error('databaseName is required');
    }

    // Use the centralized connection manager from db.js
    return getTenantConnection(databaseName);
  }

  /**
   * Get a tenant database instance (reuses existing connections)
   */
  static async getTenantDb(databaseName, timeoutMs = 5000) {
    if (!databaseName) {
      throw new Error('databaseName is required');
    }

    // Use the centralized connection manager from db.js
    return await getTenantDb(databaseName, timeoutMs);
  }

  /**
   * Get dynamic list of databases from the main connection
   */
  static async getDynamicDatabases() {
    try {
      // Use the main mongoose connection (already connected in index.js)
      const User = require('../models/User').model;
      
      const users = await User.find({}).select('databaseName role');
      const databasesToCheck = [
        'propinspection_users', // Main users database
        'admin',
        'config'
      ];
      
      users.forEach(user => {
        if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
          databasesToCheck.push(user.databaseName);
        }
      });
      
      console.log(`Dynamic database list: ${databasesToCheck.length} databases - [${databasesToCheck.join(', ')}]`);
      return databasesToCheck;
    } catch (error) {
      console.error('Error getting dynamic databases:', error);
      return ['propinspection_users', 'admin', 'config'];
    }
  }

  /**
   * Get connection statistics for monitoring
   */
  static getConnectionStats() {
    return getConnectionStats();
  }

  /**
   * Clear all cached connections (for testing or maintenance)
   */
  static clearCache() {
    connectionCache.clear();
    console.log('Database connection cache cleared');
  }
}

module.exports = {
  setUserDatabase,
  getUserModels,
  DatabaseManager,
  // Export the class as default for backward compatibility
  default: DatabaseManager
};