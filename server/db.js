const mongoose = require('mongoose');

let mainConnectionPromise = null;
let isMainConnected = false;

// Cache per-tenant/createConnection instances by database name
const tenantConnections = new Map();

// Connection configuration with strict limits
const CONNECTION_CONFIG = {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL || '5', 10), // Reduced from 10 to 5
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL || '1', 10),
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  // Removed bufferMaxEntries and bufferCommands as they're not supported in newer MongoDB drivers
};

const TENANT_CONNECTION_CONFIG = {
  maxPoolSize: parseInt(process.env.MONGO_TENANT_MAX_POOL || '3', 10), // Reduced from 5 to 3
  minPoolSize: parseInt(process.env.MONGO_TENANT_MIN_POOL || '0', 10),
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  // Removed bufferMaxEntries and bufferCommands as they're not supported in newer MongoDB drivers
};

function buildDbUri(baseUri, databaseName) {
  const lastSlashIndex = baseUri.lastIndexOf('/');
  const baseConnection = baseUri.substring(0, lastSlashIndex);
  return `${baseConnection}/${databaseName}`;
}

async function connectMain() {
  if (isMainConnected && mongoose.connection?.readyState === 1) return mongoose;
  if (mainConnectionPromise) return mainConnectionPromise;

  const baseUri = process.env.MONGODB_URI;
  const mainDbName = process.env.MAIN_DB_NAME || 'propinspection_users';
  const userManagementUri = buildDbUri(baseUri, mainDbName);

  console.log(`Connecting to main database with maxPoolSize: ${CONNECTION_CONFIG.maxPoolSize}`);

  mainConnectionPromise = mongoose.connect(userManagementUri, CONNECTION_CONFIG).then((conn) => {
    isMainConnected = true;
    console.log(`Main database connected. Pool size: ${CONNECTION_CONFIG.maxPoolSize}`);
    return conn;
  }).catch((err) => {
    mainConnectionPromise = null;
    console.error('Main database connection failed:', err.message);
    throw err;
  });

  return mainConnectionPromise;
}

function getTenantConnection(databaseName) {
  if (!databaseName) throw new Error('databaseName is required');
  
  // Check if we already have a valid connection
  if (tenantConnections.has(databaseName)) {
    const existing = tenantConnections.get(databaseName);
    if (existing.readyState === 1) {
      return existing;
    }
    // Remove invalid connection
    tenantConnections.delete(databaseName);
  }

  const baseUri = process.env.MONGODB_URI;
  const dbUri = buildDbUri(baseUri, databaseName);

  console.log(`Creating tenant connection for ${databaseName} with maxPoolSize: ${TENANT_CONNECTION_CONFIG.maxPoolSize}`);

  const connection = mongoose.createConnection(dbUri, TENANT_CONNECTION_CONFIG);

  connection.on('error', (err) => {
    console.error(`Tenant connection error for ${databaseName}:`, err.message);
    tenantConnections.delete(databaseName);
  });

  connection.on('disconnected', () => {
    console.log(`Tenant connection disconnected for ${databaseName}`);
    tenantConnections.delete(databaseName);
  });

  connection.on('connected', () => {
    console.log(`Tenant connection established for ${databaseName}`);
  });

  tenantConnections.set(databaseName, connection);
  return connection;
}

async function closeAll() {
  console.log('Closing all database connections...');
  const closers = [];
  
  try {
    if (mongoose.connection?.readyState === 1) {
      console.log('Closing main mongoose connection...');
      closers.push(mongoose.disconnect());
    }
  } catch (err) {
    console.error('Error closing main connection:', err.message);
  }

  for (const [name, conn] of tenantConnections.entries()) {
    try {
      if (conn?.readyState === 1) {
        console.log(`Closing tenant connection: ${name}`);
        closers.push(conn.close());
      }
    } catch (err) {
      console.error(`Error closing tenant connection ${name}:`, err.message);
    }
  }
  tenantConnections.clear();

  await Promise.allSettled(closers);
  console.log('All database connections closed');
}

// Add connection monitoring
function getConnectionStats() {
  const stats = {
    main: {
      readyState: mongoose.connection?.readyState || 0,
      host: mongoose.connection?.host || 'N/A',
      name: mongoose.connection?.name || 'N/A'
    },
    tenants: {}
  };

  for (const [name, conn] of tenantConnections.entries()) {
    stats.tenants[name] = {
      readyState: conn.readyState,
      host: conn.host || 'N/A',
      name: conn.name || 'N/A'
    };
  }

  return stats;
}

module.exports = {
  connectMain,
  getTenantConnection,
  /**
   * Ensure the tenant connection is open and return the native MongoDB Db
   */
  getTenantDb: async (databaseName, timeoutMs = 5000) => {
    const conn = getTenantConnection(databaseName);
    if (conn.readyState === 1 && conn.db) return conn.db;
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`Timeout opening DB for ${databaseName}`)), timeoutMs);
      conn.once('open', () => { clearTimeout(t); resolve(); });
      conn.once('error', (err) => { clearTimeout(t); reject(err); });
    });
    return conn.db;
  },
  closeAll,
  getConnectionStats,
  // Export connection configs for reference
  CONNECTION_CONFIG,
  TENANT_CONNECTION_CONFIG,
};


