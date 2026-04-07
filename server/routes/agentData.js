const express = require('express');
const { setUserDatabase, getUserModels } = require('../middleware/databaseRouter');
const { setAgentDatabase, getAgentModels } = require('../middleware/agentDatabaseRouter');
const router = express.Router();

// Apply user database middleware to all routes
router.use(setUserDatabase);

// Apply agent database middleware to agent-specific routes
router.use('/:agentId', setAgentDatabase);

// GET /api/agent-data/:agentId/properties - Get properties for specific agent
router.get('/:agentId/properties', async (req, res) => {
  try {
    const models = getAgentModels(req.agentDatabase);
    const properties = await models.Property.find();
    res.json({
      success: true,
      data: properties,
      agent: req.agent.firstName + ' ' + req.agent.lastName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent properties',
      error: error.message
    });
  }
});

// POST /api/agent-data/:agentId/properties - Create property for specific agent
router.post('/:agentId/properties', async (req, res) => {
  try {
    const models = getAgentModels(req.agentDatabase);
    
    console.log('Creating property for agent:', req.agent.databaseName);
    console.log('Property data:', req.body);
    
    const property = new models.Property(req.body);
    await property.save();
    
    res.status(201).json({
      success: true,
      message: 'Property created successfully for agent',
      data: property
    });
  } catch (error) {
    console.error('Agent property creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property for agent',
      error: error.message
    });
  }
});

// GET /api/agent-data/:agentId/clients - Get clients for specific agent
router.get('/:agentId/clients', async (req, res) => {
  try {
    const models = getAgentModels(req.agentDatabase);
    const clients = await models.Client.find();
    res.json({
      success: true,
      data: clients,
      agent: req.agent.firstName + ' ' + req.agent.lastName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent clients',
      error: error.message
    });
  }
});

// POST /api/agent-data/:agentId/clients - Create client for specific agent
router.post('/:agentId/clients', async (req, res) => {
  try {
    const models = getAgentModels(req.agentDatabase);
    
    console.log('Creating client for agent:', req.agent.databaseName);
    console.log('Client data:', req.body);
    
    const client = new models.Client(req.body);
    await client.save();
    
    res.status(201).json({
      success: true,
      message: 'Client created successfully for agent',
      data: client
    });
  } catch (error) {
    console.error('Agent client creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client for agent',
      error: error.message
    });
  }
});

// GET /api/agent-data/:agentId/inspections - Get inspections for specific agent
router.get('/:agentId/inspections', async (req, res) => {
  try {
    const models = getAgentModels(req.agentDatabase);
    const inspections = await models.Inspection.find();
    res.json({
      success: true,
      data: inspections,
      agent: req.agent.firstName + ' ' + req.agent.lastName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent inspections',
      error: error.message
    });
  }
});

// POST /api/agent-data/:agentId/inspections - Create inspection for specific agent
router.post('/:agentId/inspections', async (req, res) => {
  try {
    const models = getAgentModels(req.agentDatabase);
    
    console.log('Creating inspection for agent:', req.agent.databaseName);
    console.log('Inspection data:', req.body);
    
    const inspection = new models.Inspection(req.body);
    await inspection.save();
    
    res.status(201).json({
      success: true,
      message: 'Inspection created successfully for agent',
      data: inspection
    });
  } catch (error) {
    console.error('Agent inspection creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inspection for agent',
      error: error.message
    });
  }
});

// GET /api/agent-data/:agentId/dashboard - Get dashboard data for specific agent
router.get('/:agentId/dashboard', async (req, res) => {
  try {
    const models = getAgentModels(req.agentDatabase);
    
    // Get counts for dashboard
    const [properties, clients, inspections] = await Promise.all([
      models.Property.countDocuments(),
      models.Client.countDocuments(),
      models.Inspection.countDocuments()
    ]);
    
    res.json({
      success: true,
      data: {
        totalProperties: properties,
        totalClients: clients,
        totalInspections: inspections,
        agent: req.agent.firstName + ' ' + req.agent.lastName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent dashboard data',
      error: error.message
    });
  }
});

module.exports = router;
