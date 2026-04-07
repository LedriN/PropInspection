const express = require('express');
const router = express.Router();
const { setUserDatabase, getUserModels } = require('../middleware/databaseRouter');
const { upload } = require('../middleware/upload');

// Apply user database middleware to all routes
router.use(setUserDatabase);

// Helper function to invalidate all caches (no longer needed but kept for compatibility)
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
  // Get all users from the main database to check their databases
    const users = await User.find({}).select('databaseName role');
  
    // Start with essential system databases
  const databasesToCheck = [
      'propinspection_users', // Main users database
    'admin',
      'config'
    ];
    
    // Add all user databases dynamically
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
    // Fallback to a minimal list if there's an error
    return ['propinspection_users', 'admin', 'config'];
  }
}

// Helper function to fetch inspections from a single database
async function fetchInspectionsFromDatabase(databaseName) {
  try {
    const db = await getTenantDb(databaseName);
    
    // Get all inspections from this database
    const collection = db.collection('inspections');
    const inspections = await collection.find({}).toArray();
    
    // Add database info to each inspection
    return inspections.map(inspection => ({
      ...inspection,
      _database: databaseName
    }));
  } catch (error) {
    console.error(`Error fetching inspections from database ${databaseName}:`, error.message);
    return [];
  }
}

// GET /api/inspections - Get all inspections (optimized)
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // No caching - always fetch fresh data for real-time updates
    
    // Get dynamic list of databases
    const databasesToCheck = await getDynamicDatabases();
    
    console.log(`Fetching inspections from ${databasesToCheck.length} databases in parallel...`);
    
    // Fetch inspections from all databases in parallel
    const inspectionPromises = databasesToCheck.map(databaseName => 
      fetchInspectionsFromDatabase(databaseName)
    );
    
    const results = await Promise.allSettled(inspectionPromises);
    
    // Combine all inspections
    let allInspections = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allInspections = allInspections.concat(result.value);
      } else {
        console.error(`Failed to fetch from database ${databasesToCheck[index]}:`, result.reason);
      }
    });
    
    // Sort all inspections by scheduled date
    allInspections.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
    
    const loadTime = Date.now() - startTime;
    console.log(`Loaded ${allInspections.length} inspections in ${loadTime}ms (no cache)`);
    
    res.json({
      success: true,
      data: allInspections,
      total: allInspections.length,
      databases: databasesToCheck.length,
      loadTime: loadTime,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inspections'
    });
  }
});

// GET /api/inspections/:id - Get inspection by ID
router.get('/:id', async (req, res) => {
  try {
    console.log('=== FETCHING INSPECTION BY ID FROM ALL DATABASES ===');
    console.log('Looking for inspection ID:', req.params.id);
    const mongoose = require('mongoose');
    
    // Get dynamic list of databases
    const allDatabases = await getDynamicDatabases();
    
    let foundInspection = null;
    
    for (const databaseName of allDatabases) {
      let db = null;
      try {
        console.log(`Checking database: ${databaseName}`);
        
        db = await getTenantDb(databaseName);
        
        // Look for the specific inspection in this database
        try {
          const collection = db.collection('inspections');
          const inspection = await collection.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
          if (inspection) {
            foundInspection = {
              ...inspection,
              _database: databaseName
            };
            console.log(`Found inspection in database: ${databaseName}`);
            break; // Found it, stop searching
          }
        } catch (err) {
          console.log(`Error searching inspection in ${databaseName}:`, err.message);
        }
        
        // Do not close pooled connection; reuse via manager
        
      } catch (error) {
        console.log(`Error checking database ${databaseName}:`, error.message);
        // Keep pooled connection open
        continue;
      }
    }
    
    if (!foundInspection) {
      console.log('Inspection not found in any database');
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }
    
    console.log('=== INSPECTION FETCH COMPLETED ===');
    res.json({
      success: true,
      data: foundInspection
    });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inspection'
    });
  }
});

// POST /api/inspections - Create new inspection
router.post('/', async (req, res) => {
  try {
    console.log('=== INSPECTION CREATION STARTED ===');
    console.log('Request received at:', new Date().toISOString());
    
    const models = getUserModels(req.userDatabase);
    const mongoose = require('mongoose');
    
    console.log('Received inspection data:', req.body);
    
    // Validate required fields
    const { clientId, propertyId, inspectorId, scheduledDate, inspectionType } = req.body;
    if (!clientId || !inspectorId || !scheduledDate || !inspectionType) {
      console.log('Missing fields:', { clientId, inspectorId, scheduledDate, inspectionType });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, inspectorId, scheduledDate, inspectionType'
      });
    }
    
    // Search for the selected inspector/agent in all databases
    console.log('Searching for inspector with ID:', inspectorId);
    
    // Get dynamic list of databases
    const allDatabases = await getDynamicDatabases();
    
    console.log('Checking property and client in databases:', allDatabases);
    
    let property = null;
    let client = null;
    let inspector = null;
    
    for (const databaseName of allDatabases) {
      let dbConnection = null;
      try {
        console.log(`Checking database: ${databaseName}`);
        
        const baseUri = process.env.MONGODB_URI;
        let dbUri;
        
        if (baseUri.includes('mongodb+srv://')) {
          const lastSlashIndex = baseUri.lastIndexOf('/');
          const baseConnection = baseUri.substring(0, lastSlashIndex);
          dbUri = `${baseConnection}/${databaseName}`;
        } else {
          const lastSlashIndex = baseUri.lastIndexOf('/');
          const baseConnection = baseUri.substring(0, lastSlashIndex);
          dbUri = `${baseConnection}/${databaseName}`;
        }
        
        dbConnection = mongoose.createConnection(dbUri, {
          serverSelectionTimeoutMS: 3000, // 3 second timeout
          connectTimeoutMS: 3000
        });
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Connection timeout for database: ${databaseName}`));
          }, 3000);
          
          dbConnection.once('open', () => {
            clearTimeout(timeout);
            resolve();
          });
          dbConnection.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
        
        // Check for property
        if (!property && propertyId) {
          try {
            const collection = dbConnection.db.collection('properties');
            console.log(`Searching for property ${propertyId} in ${databaseName}/properties`);
            const foundProperty = await collection.findOne({ _id: new mongoose.Types.ObjectId(propertyId) });
            if (foundProperty) {
              property = foundProperty;
              console.log(`Found property in database: ${databaseName}`, foundProperty);
            } else {
              console.log(`Property ${propertyId} not found in ${databaseName}/properties`);
            }
          } catch (err) {
            console.log(`Error searching properties in ${databaseName}:`, err.message);
          }
        }
        
        // Check for client
        if (!client) {
          try {
            const collection = dbConnection.db.collection('clients');
            console.log(`Searching for client ${clientId} in ${databaseName}/clients`);
            const foundClient = await collection.findOne({ _id: new mongoose.Types.ObjectId(clientId) });
            if (foundClient) {
              client = foundClient;
              console.log(`Found client in database: ${databaseName}`, foundClient);
            } else {
              console.log(`Client ${clientId} not found in ${databaseName}/clients`);
            }
          } catch (err) {
            console.log(`Error searching clients in ${databaseName}:`, err.message);
          }
        }
        
        // Check for inspector/agent
        if (!inspector) {
          try {
            const collection = dbConnection.db.collection('agents');
            console.log(`Searching for inspector ${inspectorId} in ${databaseName}/agents`);
            const foundInspector = await collection.findOne({ _id: new mongoose.Types.ObjectId(inspectorId) });
            if (foundInspector) {
              inspector = foundInspector;
              console.log(`Found inspector in database: ${databaseName}`, foundInspector);
            } else {
              console.log(`Inspector ${inspectorId} not found in ${databaseName}/agents`);
            }
          } catch (err) {
            console.log(`Error searching agents in ${databaseName}:`, err.message);
          }
        }
        
        // Close the connection
        if (dbConnection) {
          await dbConnection.close();
        }
        
        // Early exit if all found
        if (property && client && inspector) {
          console.log('Property, client, and inspector found, stopping search');
          break;
        }
        
      } catch (error) {
        console.log(`Error checking database ${databaseName}:`, error.message);
        if (dbConnection) {
          try {
            await dbConnection.close();
          } catch (closeError) {
            console.log(`Error closing connection to ${databaseName}:`, closeError.message);
          }
        }
        continue;
      }
    }
    
    // Validate that we found the required entities
    if (!client) {
      console.log('Client not found in any database');
      return res.status(400).json({
        success: false,
        message: 'Client not found in any database'
      });
    }
    
    if (!inspector) {
      console.log('Inspector not found in any database');
      return res.status(400).json({
        success: false,
        message: 'Inspector not found in any database'
      });
    }
    
    if (propertyId && !property) {
      console.log('Property not found in any database');
      return res.status(400).json({
        success: false,
        message: 'Property not found in any database'
      });
    }
    
    console.log('Creating inspection with found entities');
    console.log('Property:', property?.address?.street || property?.name || 'No property');
    console.log('Client:', `${client.firstName} ${client.lastName}`);
    console.log('Inspector:', `${inspector.firstName} ${inspector.lastName}`);
    
    // Create the inspection with names and contact information stored directly
    const inspection = new models.Inspection({
      ...req.body,
      // Store names directly instead of IDs for easier display
      property_name: property ? (property.address?.street || property.name || 'Property Address') : 'Property Address',
      client_name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client Name',
      inspector_name: `${inspector.firstName || ''}${inspector.lastName || ''}`.trim() || 'Inspector Name',
      // Store client contact information
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: client.address ? 
        (typeof client.address === 'string' ? client.address : 
         `${client.address.street || ''}${client.address.city ? `, ${client.address.city}` : ''}${client.address.state ? `, ${client.address.state}` : ''}${client.address.zipCode ? ` ${client.address.zipCode}` : ''}${client.address.country ? `, ${client.address.country}` : ''}`.trim()) : '',
      // Store property details
      property_type: property?.propertyType || '',
      property_size: property?.size ? 
        (typeof property.size === 'string' ? property.size : 
         `${property.size.bedrooms || 0} bed, ${property.size.bathrooms || 0} bath${property.size.squareFeet ? `, ${property.size.squareFeet} sq ft` : ''}`) : '',
      // Store inspector contact information
      inspector_email: inspector.email || '',
      inspector_phone: inspector.phone || ''
    });
    
    await inspection.save();
    
    console.log('Inspection created successfully:', inspection._id);
    console.log('=== INSPECTION CREATION COMPLETED ===');
    
    // Invalidate caches so new inspection shows up immediately
    invalidateAllCaches();
    
    res.status(201).json({
      success: true,
      data: inspection,
      message: 'Inspection scheduled successfully'
    });
  } catch (error) {
    console.error('Error creating inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule inspection'
    });
  }
});

// PUT /api/inspections/:id - Update inspection
router.put('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    const inspection = await models.Inspection.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }
    
    // Invalidate caches so updates are reflected immediately
    invalidateAllCaches();
    
    // Since we're storing full names instead of IDs, we don't need to populate
    res.json({
      success: true,
      data: inspection,
      message: 'Inspection updated successfully'
    });
  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inspection'
    });
  }
});

// DELETE /api/inspections/:id - Delete inspection
router.delete('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const inspection = await models.Inspection.findByIdAndDelete(req.params.id);
    
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.json({
      success: true,
      message: 'Inspection deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inspection'
    });
  }
});

// PATCH /api/inspections/:id/complete - Mark inspection as completed
router.patch('/:id/complete', upload.any(), async (req, res) => {
  try {
    console.log('=== MARKING INSPECTION AS COMPLETED ===');
    console.log('Inspection ID:', req.params.id);
    console.log('User database:', req.userDatabase);
    
    const mongoose = require('mongoose');
    
    // Get dynamic list of databases for the specific inspection
    const allDatabases = await getDynamicDatabases();
    
    let foundInspection = null;
    let inspectionDatabase = null;
    
    for (const databaseName of allDatabases) {
      let db = null;
      try {
        console.log(`Checking database: ${databaseName}`);
        
        db = await getTenantDb(databaseName);
        
        // Look for the specific inspection in this database
        try {
          const collection = db.collection('inspections');
          const inspection = await collection.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
          if (inspection) {
            foundInspection = inspection;
            inspectionDatabase = databaseName;
            console.log(`Found inspection in database: ${databaseName}`);
            break; // Found it, stop searching
          }
        } catch (err) {
          console.log(`Error searching inspection in ${databaseName}:`, err.message);
        }
        
      } catch (error) {
        console.log(`Error checking database ${databaseName}:`, error.message);
        continue;
      }
    }
    
    if (!foundInspection) {
      console.log('Inspection not found in any database');
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }
    
    // Get the models for the database where the inspection was found
    const models = getUserModels(inspectionDatabase);
    
    // Allow completing inspections regardless of scheduled date
    // (inspections can be completed early or late as needed)
    console.log('Scheduled date:', foundInspection.scheduledDate);
    console.log('Current date:', new Date());
    
    // Update the inspection with completion data
    const updateData = {
      isCompleted: true,
      status: 'completed',
      completedDate: new Date(),
      updatedAt: new Date()
    };
    
    // Add summary if provided
    if (req.body.summary) {
      updateData.summary = req.body.summary;
    }
    
    // Add findings if provided
    if (req.body.findings && Array.isArray(req.body.findings)) {
      updateData.findings = req.body.findings;
    }
    
    // Add recommendations if provided
    if (req.body.recommendations && Array.isArray(req.body.recommendations)) {
      updateData.recommendations = req.body.recommendations;
    }
    
    console.log('=== UPDATING INSPECTION ===');
    console.log('Inspection ID to update:', req.params.id);
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    console.log('Database being updated:', inspectionDatabase);
    
    const updatedInspection = await models.Inspection.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    console.log('=== INSPECTION UPDATE RESULT ===');
    console.log('Updated inspection ID:', updatedInspection._id);
    console.log('Updated inspection status:', updatedInspection.status);
    console.log('Updated inspection isCompleted:', updatedInspection.isCompleted);
    console.log('Updated inspection completedDate:', updatedInspection.completedDate);
    console.log('Updated inspection summary:', updatedInspection.summary);
    console.log('Updated inspection findings count:', updatedInspection.findings?.length || 0);
    console.log('Updated inspection recommendations count:', updatedInspection.recommendations?.length || 0);
    
    // Automatically create a report from the completed inspection
    try {
      console.log('=== CREATING AUTOMATIC REPORT ===');
      console.log('User database:', req.userDatabase);
      console.log('Inspection database:', inspectionDatabase);
      console.log('Current user:', req.user);
      
      // Get the database for report creation (use the same database where inspection was found)
      const userModels = getUserModels(inspectionDatabase);
      
      console.log('Database connection established for report creation in:', inspectionDatabase);
      console.log('Available models:', Object.keys(userModels));
      
      // Verify Report model exists
      if (!userModels.Report) {
        throw new Error('Report model not found in user models');
      }
      
      // Process uploaded files (signatures and images)
      const signatures = {};
      const images = {};
      
      if (req.files && req.files.length) {
        console.log('=== PROCESSING UPLOADED FILES FOR REPORT ===');
        console.log('Number of files received:', req.files.length);
        
        for (const file of req.files) {
          console.log(`Processing file: ${file.fieldname}`);
          console.log(`File details:`, {
            fieldname: file.fieldname,
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path
          });
          
          // Handle signature files
          if (file.fieldname === 'agentSignature' || file.fieldname === 'clientSignature') {
            signatures[file.fieldname] = {
              filename: file.filename,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path
            };
            console.log(`Added signature: ${file.fieldname}`);
          } else {
            // Handle inspection images
            const fieldname = file.fieldname;
            if (!images[fieldname]) {
              images[fieldname] = [];
            }
            images[fieldname].push({
              filename: file.filename,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: file.path
            });
            console.log(`Added image: ${fieldname}`);
          }
        }
      }

      // Parse complex fields from request body
      function safeParse(obj, key) {
        if (!obj || obj[key] == null) return undefined;
        try {
          if (typeof obj[key] === 'string') return JSON.parse(obj[key]);
          return obj[key];
        } catch (_e) { return obj[key]; }
      }

      // Utilities to convert any base64 data:image values to saved MongoDB GridFS image IDs
      const { saveBase64ImageToGridFS } = require('../services/imageStorage');
      async function saveDataUriToUploads(dataUri) {
        try {
          if (!req.user || !req.user.databaseName) {
            console.error('User database not found for saving image');
            return null;
          }
          const databaseName = req.user.databaseName;
          const imageId = await saveBase64ImageToGridFS(dataUri, databaseName);
          return `/api/images/${imageId}`;
        } catch (error) {
          console.error('Error saving base64 image to MongoDB:', error);
          return null;
        }
      }
      async function replaceDataUrisDeep(value) {
        if (!value) return value;
        if (typeof value === 'string') {
          if (value.startsWith('data:image/')) {
            const url = await saveDataUriToUploads(value);
            return url || value;
          }
          return value;
        }
        if (Array.isArray(value)) {
          return await Promise.all(value.map(v => replaceDataUrisDeep(v)));
        }
        if (typeof value === 'object') {
          const copy = Array.isArray(value) ? [] : { ...value };
          if (typeof value.uri === 'string' && value.uri.startsWith('data:image/')) {
            const url = await saveDataUriToUploads(value.uri);
            copy.uri = url || value.uri;
            return copy;
          }
          for (const k of Object.keys(value)) {
            copy[k] = await replaceDataUrisDeep(value[k]);
          }
          return copy;
        }
        return value;
      }

      const inspectionData = await replaceDataUrisDeep(safeParse(req.body, 'inspectionData') || {});
      const processedImages = safeParse(req.body, 'images') || {};

      // Create report data from the completed inspection
      const reportData = {
        title: `Inspection Report - ${foundInspection.property_name || 'Property'}`,
        report_type: 'inspection',
        property_id: foundInspection.propertyId,
        agent_id: foundInspection.inspectorId,
        client_id: foundInspection.clientId,
        content: {
          inspectionId: foundInspection._id,
          summary: req.body.summary || '',
          findings: req.body.findings || [],
          recommendations: req.body.recommendations || [],
          completedDate: new Date(),
          inspectionType: foundInspection.inspectionType,
          inspectionData: inspectionData,
          images: { ...processedImages, ...images },
          signatures: signatures
        },
        status: 'Completed',
        generated_at: new Date(),
        generated_by: req.user?.databaseName || req.user?.email || 'system',
        property_name: foundInspection.property_name || '',
        client_name: foundInspection.client_name || '',
        agent_name: foundInspection.inspector_name || '',
        // Store emails for easy access
        agent_email: req.user?.email || '',
        client_email: foundInspection.client_email || ''
      };
      
      console.log('Report data to be created:', JSON.stringify(reportData, null, 2));
      
      // Create and save the report
      const report = new userModels.Report(reportData);
      console.log('Report instance created, attempting to save...');
      
      const savedReport = await report.save();
      
      console.log('=== REPORT CREATED SUCCESSFULLY ===');
      console.log('Report ID:', savedReport._id);
      console.log('Report title:', savedReport.title);
      console.log('Report status:', savedReport.status);
      console.log('Report generated_by:', savedReport.generated_by);
      console.log('Report database:', req.userDatabase);
      console.log('Report property_name:', savedReport.property_name);
      console.log('Report client_name:', savedReport.client_name);
      console.log('Report agent_name:', savedReport.agent_name);
      
      // Verify the report was actually saved by querying it back
      const verifyReport = await userModels.Report.findById(savedReport._id);
      if (verifyReport) {
        console.log('=== REPORT VERIFICATION SUCCESSFUL ===');
        console.log('Report found in database:', verifyReport._id);
      } else {
        console.error('=== REPORT VERIFICATION FAILED ===');
        console.error('Report not found in database after save');
      }
      
    } catch (reportError) {
      console.error('=== ERROR CREATING AUTOMATIC REPORT ===');
      console.error('Error details:', reportError);
      console.error('Error message:', reportError.message);
      console.error('Error stack:', reportError.stack);
      console.error('Error name:', reportError.name);
      console.error('Error code:', reportError.code);
      // Don't fail the inspection completion if report creation fails
    }
    
    // Invalidate all caches since inspection status changed
    invalidateAllCaches();
    
    res.json({
      success: true,
      message: 'Inspection marked as completed successfully',
      data: updatedInspection
    });
  } catch (error) {
    console.error('Error marking inspection as completed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark inspection as completed'
    });
  }
});

// GET /api/inspections/schedule - Get scheduled inspections
router.get('/schedule', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const { startDate, endDate } = req.query;
    
    let query = { status: { $in: ['scheduled', 'in-progress'] } };
    
    if (startDate && endDate) {
      query.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const inspections = await models.Inspection.find(query)
      .sort({ scheduledDate: 1 });
    
    // Since we're storing full names instead of IDs, we don't need to populate
    res.json({
      success: true,
      data: inspections
    });
  } catch (error) {
    console.error('Error fetching scheduled inspections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled inspections'
    });
  }
});

// Test endpoint to create a simple report (for debugging)
router.post('/test-report', async (req, res) => {
  try {
    console.log('=== TESTING REPORT CREATION ===');
    console.log('User database:', req.userDatabase);
    console.log('Current user:', req.user);
    
    const models = getUserModels(req.userDatabase);
    console.log('Available models:', Object.keys(models));
    
    if (!models.Report) {
      return res.status(500).json({
        success: false,
        message: 'Report model not found'
      });
    }
    
    const testReportData = {
      title: 'Test Report - ' + new Date().toISOString(),
      report_type: 'inspection',
      property_id: new require('mongoose').Types.ObjectId(),
      agent_id: new require('mongoose').Types.ObjectId(),
      client_id: new require('mongoose').Types.ObjectId(),
      content: {
        test: true,
        created_at: new Date()
      },
      status: 'Completed',
      generated_at: new Date(),
      generated_by: req.user?.databaseName || req.user?.email || 'test',
      property_name: 'Test Property',
      client_name: 'Test Client',
      agent_name: 'Test Agent'
    };
    
    console.log('Creating test report with data:', testReportData);
    
    const testReport = new models.Report(testReportData);
    const savedTestReport = await testReport.save();
    
    console.log('Test report created successfully:', savedTestReport._id);
    
    res.json({
      success: true,
      message: 'Test report created successfully',
      data: savedTestReport
    });
  } catch (error) {
    console.error('Error creating test report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test report',
      error: error.message
    });
  }
});

module.exports = router;
