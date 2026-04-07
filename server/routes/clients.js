const express = require('express');
const router = express.Router();
const { setUserDatabase, getUserModels } = require('../middleware/databaseRouter');

// Apply user database middleware to all routes
router.use(setUserDatabase);

// Helper function to invalidate all caches (caching disabled)
const invalidateAllCaches = () => {
  console.log('Cache invalidation called (caching disabled)');
};

// Centralized connection getter
const { getTenantDb } = require('../db');

// Helper function to get dynamic list of databases
async function getDynamicDatabases() {
  const mongoose = require('mongoose');
  const User = require('../models/User').model;
  
  try {
    const users = await User.find({}).select('databaseName role');
    const databasesToCheck = [
      'propinspection_users', // Main users database
      'admin',
      'config'
    ];
    users.forEach(user => {
      if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
        databasesToCheck.push(user.databaseName);
        console.log(`Added user database: ${user.databaseName} (role: ${user.role})`);
      }
    });
    console.log(`Dynamic database list: ${databasesToCheck.length} databases - [${databasesToCheck.join(', ')}]`);
    return databasesToCheck;
  } catch (error) {
    console.error('Error getting dynamic databases:', error);
    return ['propinspection_users', 'admin', 'config'];
  }
}

// Helper function to fetch clients from a single database
async function fetchClientsFromDatabase(databaseName) {
  try {
    const db = await getTenantDb(databaseName);
    
    // Check for 'clients' collection first
    const clientsExists = await db.listCollections({ name: 'clients' }).hasNext();
    if (clientsExists) {
      const collection = db.collection('clients');
      const docs = await collection.find({}).toArray();
      
      return docs.map(doc => ({
        _id: doc._id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phone: doc.phone || '',
        address: doc.address || {},
        preferences: doc.preferences || {},
        budget: doc.budget || 0,
        status: doc.status || 'active',
        notes: doc.notes || '',
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
    const alternativeNames = ['Clients', 'client', 'Client'];
    for (const altName of alternativeNames) {
      const altExists = await db.listCollections({ name: altName }).hasNext();
      if (altExists) {
        const altCollection = db.collection(altName);
        const docs = await altCollection.find({}).toArray();
        
        return docs.map(doc => ({
          _id: doc._id,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          phone: doc.phone || '',
          address: doc.address || {},
          preferences: doc.preferences || {},
          budget: doc.budget || 0,
          status: doc.status || 'active',
          notes: doc.notes || '',
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
    console.error(`Error fetching clients from database ${databaseName}:`, error.message);
    return [];
  }
}

// GET /api/clients - Get all clients from all databases (no caching for real-time updates)
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    console.log('=== FETCHING CLIENTS ===');
    console.log('User database:', req.userDatabase);
    console.log('Current user:', req.user);
    
    // Get dynamic list of databases
    const databasesToCheck = await getDynamicDatabases();
    
    console.log(`Fetching clients from ${databasesToCheck.length} databases in parallel...`);
    
    // Fetch clients from all databases in parallel
    const clientPromises = databasesToCheck.map(databaseName => 
      fetchClientsFromDatabase(databaseName)
    );
    
    const results = await Promise.allSettled(clientPromises);
    
    // Combine all clients
    let allClients = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allClients = allClients.concat(result.value);
      } else {
        console.error(`Failed to fetch from database ${databasesToCheck[index]}:`, result.reason);
      }
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`Loaded ${allClients.length} clients in ${loadTime}ms (no cache)`);
    console.log('Clients found:', allClients.map(c => ({ id: c._id, name: `${c.firstName} ${c.lastName}`, email: c.email })));
    
    res.json({
      success: true,
      data: allClients,
      total: allClients.length,
      databases: databasesToCheck.length,
      databasesChecked: databasesToCheck,
      loadTime: loadTime,
      cached: false // Explicitly state not cached
    });
  } catch (error) {
    console.error('Error fetching all clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients from all databases',
      error: error.message
    });
  }
});

// GET /api/clients/:id - Get client by ID
router.get('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const client = await models.Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client'
    });
  }
});

// POST /api/clients - Create new client
router.post('/', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    // Validate required fields
    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, email, phone'
      });
    }
    
    // Check if email already exists
    const existingClient = await models.Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Client with this email already exists'
      });
    }
    
    const client = new models.Client(req.body);
    await client.save();
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client'
    });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    // Check if email is being updated and if it already exists
    if (req.body.email) {
      const existingClient = await models.Client.findOne({ 
        email: req.body.email, 
        _id: { $ne: req.params.id } 
      });
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Client with this email already exists'
        });
      }
    }
    
    const client = await models.Client.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.json({
      success: true,
      data: client,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update client'
    });
  }
});

// DELETE /api/clients/:id - Delete client
router.delete('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const client = await models.Client.findByIdAndDelete(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete client'
    });
  }
});

module.exports = router;
