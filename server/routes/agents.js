const express = require('express');
const { setUserDatabase, getUserModels } = require('../middleware/databaseRouter');
const router = express.Router();

// Apply user database middleware to all routes
router.use(setUserDatabase);

// Cache for agents and database connections
const agentsCache = new Map();
const connectionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to invalidate all caches
const invalidateAllCaches = () => {
  agentsCache.clear();
  connectionCache.clear();
  console.log('All caches invalidated');
};

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean up connection cache
  for (const [key, value] of connectionCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      connectionCache.delete(key);
    }
  }
  
  // Clean up agents cache
  for (const [key, value] of agentsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      agentsCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes

// Import centralized database manager
const { DatabaseManager } = require('../middleware/databaseRouter');

// Helper function to get or create database connection (now uses centralized manager)
async function getDatabaseConnection(databaseName) {
  return DatabaseManager.getTenantConnection(databaseName);
}

// Helper function to get dynamic list of databases
async function getDynamicDatabases() {
  const mongoose = require('mongoose');
  const User = require('../models/User').model;
  
  // Get all users from the main database to check their databases
  const users = await User.find({ role: 'agent' }).select('databaseName');
  console.log(`Found ${users.length} agent users with databases`);
  
  // Start with system databases (excluding system databases)
  const databasesToCheck = [
    'admin',
    'config', 
    'donaldtrump',
    'janesmith',
    'johndoe',
    'ledribaba',
    'ledrinushi',
    'lolakacurri',
    'luancoli',
    'propinspection_users'
  ];
  
  // Add user databases to the list dynamically
  users.forEach(user => {
    if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
      databasesToCheck.push(user.databaseName);
    }
  });
  
  console.log(`Dynamic databases to check: ${databasesToCheck.length} databases`);
  return databasesToCheck;
}

// Helper function to fetch agents from a single database
async function fetchAgentsFromDatabase(databaseName) {
  try {
    const dbConnection = await getDatabaseConnection(databaseName);
    
    // Check for 'agents' collection first
    const agentsExists = await dbConnection.db.listCollections({ name: 'agents' }).hasNext();
    if (agentsExists) {
      const collection = dbConnection.db.collection('agents');
      const docs = await collection.find({}).toArray();
      
      return docs.map(doc => ({
        _id: doc._id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phone: doc.phone || '',
        experience: doc.experience || 0,
        commissionRate: doc.commissionRate || 0,
        rating: doc.rating || 0,
        completed_inspections: doc.completed_inspections || 0,
        workload: doc.workload || 0,
        databaseName: doc.databaseName || databaseName,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        __v: doc.__v || 0,
        _database: {
          name: databaseName,
          source: 'database'
        }
      }));
    }
    
    // Try alternative collection names
    const alternativeNames = ['Agents', 'agent', 'Agent'];
    for (const altName of alternativeNames) {
      const altExists = await dbConnection.db.listCollections({ name: altName }).hasNext();
      if (altExists) {
        const altCollection = dbConnection.db.collection(altName);
        const docs = await altCollection.find({}).toArray();
        
        return docs.map(doc => ({
          _id: doc._id,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          phone: doc.phone || '',
          experience: doc.experience || 0,
          commissionRate: doc.commissionRate || 0,
          rating: doc.rating || 0,
          completed_inspections: doc.completed_inspections || 0,
          workload: doc.workload || 0,
          databaseName: doc.databaseName || databaseName,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          __v: doc.__v || 0,
          _database: {
            name: databaseName,
            source: 'database'
          }
        }));
      }
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching agents from database ${databaseName}:`, error.message);
    return [];
  }
}

// GET /api/agents - Get all agents from all databases + current user (optimized)
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = `agents_${req.user?.id || 'anonymous'}`;
    if (agentsCache.has(cacheKey)) {
      const cached = agentsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`Returning cached agents (${cached.data.length} agents)`);
        return res.json({
          success: true,
          data: cached.data,
          total: cached.data.length,
          cached: true,
          loadTime: Date.now() - startTime
        });
      }
      agentsCache.delete(cacheKey);
    }
    
    // Get dynamic list of databases
    const databasesToCheck = await getDynamicDatabases();
    
    let allAgents = [];
    
    // First, add the current logged-in user as an agent
    if (req.user) {
      console.log('Adding current user as agent:', req.user.email);
      allAgents.push({
        _id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone || '',
        experience: 0,
        commissionRate: 0,
        rating: 0,
        completed_inspections: 0,
        workload: 0,
        databaseName: req.user.databaseName || 'current_user',
        _isCurrentUser: true,
        _database: {
          name: 'current_user',
          source: 'current_user'
        }
      });
    }
    
    console.log(`Fetching agents from ${databasesToCheck.length} databases in parallel...`);
    
    // Fetch agents from all databases in parallel
    const agentPromises = databasesToCheck.map(databaseName => 
      fetchAgentsFromDatabase(databaseName)
    );
    
    const results = await Promise.allSettled(agentPromises);
    
    // Combine all agents
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allAgents = allAgents.concat(result.value);
      } else {
        console.error(`Failed to fetch from database ${databasesToCheck[index]}:`, result.reason);
      }
    });
    
    // Cache the results
    agentsCache.set(cacheKey, {
      data: allAgents,
      timestamp: Date.now()
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`Loaded ${allAgents.length} agents in ${loadTime}ms`);
    
    res.json({
      success: true,
      data: allAgents,
      total: allAgents.length,
      databases: databasesToCheck.length,
      databasesChecked: databasesToCheck,
      loadTime: loadTime,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching all agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents from all databases',
      error: error.message
    });
  }
});

// GET /api/agents/:id - Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const agent = await models.Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent',
      error: error.message
    });
  }
});

// POST /api/agents - Create new agent
router.post('/', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    console.log('Received agent data:', req.body);
    
    // Generate unique agent database name
    let baseAgentName = `${req.body.firstName.toLowerCase()}${req.body.lastName.toLowerCase()}`;
    let agentDatabaseName = baseAgentName;
    let counter = 1;

    // Check for duplicate agent database name and add number if needed
    while (await models.Agent.findOne({ databaseName: agentDatabaseName })) {
      agentDatabaseName = `${baseAgentName}${counter}`;
      counter++;
    }
    
    // Generate unique license number if not provided or empty
    let licenseNumber = req.body.licenseNumber;
    if (!licenseNumber || licenseNumber.trim() === '') {
      // Generate a unique license number
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      licenseNumber = `RE-${timestamp}${randomSuffix}`;
      
      // Ensure uniqueness by checking if it already exists
      let counter = 1;
      let originalLicenseNumber = licenseNumber;
      while (await models.Agent.findOne({ licenseNumber })) {
        licenseNumber = `${originalLicenseNumber}-${counter}`;
        counter++;
      }
    }

    const agentData = {
      ...req.body,
      // Convert string numbers to actual numbers
      experience: parseInt(req.body.experience) || 0,
      commissionRate: parseFloat(req.body.commissionRate) || 0,
      rating: 0,
      completed_inspections: 0,
      workload: 0,
      databaseName: agentDatabaseName, // Add unique database name
      licenseNumber: licenseNumber // Ensure unique license number
    };

    console.log('Parsed agent data:', agentData);

    // Save agent to user's database (for management purposes)
    const agent = new models.Agent(agentData);
    await agent.save();

    // ALSO save agent to propinspection_users database for login purposes
    try {
      const mongoose = require('mongoose');
      const User = require('../models/User').model;
      
      // Check if agent already exists in users database
      const existingAgentUser = await User.findOne({ email: req.body.email });
      if (existingAgentUser) {
        console.log('Agent user already exists in propinspection_users');
      } else {
        // Create agent user in propinspection_users database
        const agentUser = new User({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          password: req.body.password,
          username: agentDatabaseName, // Use database name as username
          databaseName: agentDatabaseName,
          role: 'agent' // Add role to distinguish from regular users
        });
        
        await agentUser.save();
        console.log(`Agent user created in propinspection_users: ${agentDatabaseName}`);
      }
    } catch (userError) {
      console.error('Error creating agent user in propinspection_users:', userError);
      // Don't fail the agent creation if user creation fails
    }

    // Create agent's dedicated database and initialize collections
    try {
      const { getUserDatabase } = require('../middleware/databaseRouter');
      const agentDatabase = await getUserDatabase(agentDatabaseName);
      console.log(`Agent database created for: ${agentDatabaseName}`);

      // Initialize collections by creating models (this creates the collections)
      const mongoose = require('mongoose');
      const Property = agentDatabase.model('Property', require('../models/Property').schema);
      const Inspection = agentDatabase.model('Inspection', require('../models/Inspection').schema);
      const Client = agentDatabase.model('Client', require('../models/Client').schema);
      const Agent = agentDatabase.model('Agent', require('../models/Agent').schema);

      console.log(`Collections initialized for agent: ${agentDatabaseName}`);
    } catch (dbError) {
      console.error('Error creating agent database:', dbError);
      // Don't fail the agent creation if database creation fails
    }
    
    // Invalidate all caches
    invalidateAllCaches(); // Clear all agent caches since we added a new agent
    
    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: {
        ...agent.toObject(),
        databaseName: agentDatabaseName
      }
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent',
      error: error.message
    });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const agent = await models.Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Invalidate all caches
    invalidateAllCaches(); // Clear all agent caches since we updated an agent
    
    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: agent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update agent',
      error: error.message
    });
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const agent = await models.Agent.findByIdAndDelete(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent',
      error: error.message
    });
  }
});

module.exports = router;
