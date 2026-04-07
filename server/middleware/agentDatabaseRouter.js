const mongoose = require('mongoose');
const { getTenantConnection } = require('../db');

// Store agent database connections (legacy map retained but delegates to db.js)
const agentDatabaseConnections = new Map();

// Get or create database connection for agent
const getAgentDatabase = async (databaseName) => {
  try {
    // Check if connection already exists
    if (agentDatabaseConnections.has(databaseName)) {
      const connection = agentDatabaseConnections.get(databaseName);
      if (connection.readyState === 1) { // Connected
        return connection;
      } else {
        // Connection is not ready, remove it
        agentDatabaseConnections.delete(databaseName);
      }
    }

    // Use centralized tenant connection manager
    const agentConnection = getTenantConnection(databaseName);

    // Store the connection
    agentDatabaseConnections.set(databaseName, agentConnection);

    // Handle connection events
    agentConnection.on('connected', () => {
      console.log(`Agent database connected: ${databaseName}`);
    });

    agentConnection.on('error', (err) => {
      console.error(`Agent database connection error for ${databaseName}:`, err);
      agentDatabaseConnections.delete(databaseName);
    });

    agentConnection.on('disconnected', () => {
      console.log(`Agent database disconnected: ${databaseName}`);
      agentDatabaseConnections.delete(databaseName);
    });

    return agentConnection;
  } catch (error) {
    console.error(`Error creating agent database connection for ${databaseName}:`, error);
    throw error;
  }
};

// Middleware to set agent-specific database
const setAgentDatabase = async (req, res, next) => {
  try {
    const agentId = req.params.agentId || req.body.agentId;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID is required'
      });
    }

    // Get agent info from main user database
    const { getUserModels } = require('./databaseRouter');
    const models = getUserModels(req.userDatabase);
    const agent = await models.Agent.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.databaseName) {
      return res.status(400).json({
        success: false,
        message: 'Agent database not configured'
      });
    }

    // Set agent database connection
    req.agentDatabase = await getAgentDatabase(agent.databaseName);
    req.agent = agent;

    next();
  } catch (error) {
    console.error('Agent database routing error:', error);
    res.status(500).json({
      success: false,
      message: 'Agent database error'
    });
  }
};

// Get agent-specific models
const getAgentModels = (agentDatabase) => {
  return {
    Property: agentDatabase.model('Property', require('../models/Property').schema),
    Inspection: agentDatabase.model('Inspection', require('../models/Inspection').schema),
    Client: agentDatabase.model('Client', require('../models/Client').schema),
    Agent: agentDatabase.model('Agent', require('../models/Agent').schema)
  };
};

module.exports = {
  getAgentDatabase,
  setAgentDatabase,
  getAgentModels
};
