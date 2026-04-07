const express = require('express');
const { setUserDatabase, getUserModels } = require('../middleware/databaseRouter');
const { upload } = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const path = require('path');
const jsonFileService = require('../services/jsonFileService');
const router = express.Router();

// Apply authentication middleware first (needed for setUserDatabase to work)
router.use(authenticateToken);

// Apply user database middleware to all routes
router.use(setUserDatabase);

// Cache for database connections and properties
const connectionCache = new Map();
const propertiesCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to invalidate all caches
const invalidateAllCaches = () => {
  propertiesCache.clear();
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
  
  // Clean up properties cache
  for (const [key, value] of propertiesCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      propertiesCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes

// Import centralized database manager
const { DatabaseManager } = require('../middleware/databaseRouter');

// Helper function to get or create database connection (now uses centralized manager)
async function getDatabaseConnection(databaseName) {
  return DatabaseManager.getTenantConnection(databaseName);
}

// Helper function to fetch properties from a single database
async function fetchPropertiesFromDatabase(databaseName) {
  try {
    const dbConnection = await getDatabaseConnection(databaseName);
    
    // Check if connection and db are valid
    if (!dbConnection || !dbConnection.db) {
      console.error(`Invalid database connection for ${databaseName}`);
      return [];
    }
    
    // Check for 'properties' collection first
    const propertiesExists = await dbConnection.db.listCollections({ name: 'properties' }).hasNext();
    if (propertiesExists) {
      const collection = dbConnection.db.collection('properties');
      const docs = await collection.find({}).toArray();
      
        return docs.map(doc => ({
          _id: doc._id,
          name: doc.name,
          propertyType: doc.propertyType,
          address: doc.address,
          coordinates: doc.coordinates || { lat: null, lng: null },
          size: doc.size,
          rent_price: doc.rent_price,
          status: doc.status,
          description: doc.description,
          features: doc.features,
          yearBuilt: doc.yearBuilt,
          parking: doc.parking,
          petFriendly: doc.petFriendly,
          furnished: doc.furnished,
          images: doc.images || [],
          pdf: doc.pdf || '',
          defects: doc.defects || [],
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
    const alternativeNames = ['Properties', 'property', 'Property'];
    for (const altName of alternativeNames) {
      const altExists = await dbConnection.db.listCollections({ name: altName }).hasNext();
      if (altExists) {
        const altCollection = dbConnection.db.collection(altName);
        const docs = await altCollection.find({}).toArray();
        
        return docs.map(doc => ({
          _id: doc._id,
          name: doc.name,
          propertyType: doc.propertyType,
          address: doc.address,
          coordinates: doc.coordinates || { lat: null, lng: null },
          size: doc.size,
          rent_price: doc.rent_price,
          status: doc.status,
          description: doc.description,
          features: doc.features,
          yearBuilt: doc.yearBuilt,
          parking: doc.parking,
          petFriendly: doc.petFriendly,
          furnished: doc.furnished,
          images: doc.images || [],
          pdf: doc.pdf || '',
          defects: doc.defects || [],
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
    console.error(`Error fetching properties from database ${databaseName}:`, error.message);
    return [];
  }
}

// GET /api/properties - Get all properties from all databases (optimized)
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check for force refresh parameter
    const forceRefresh = req.query.refresh === 'true';
    
    // Check cache first (unless force refresh is requested)
    const cacheKey = 'all_properties';
    if (!forceRefresh && propertiesCache.has(cacheKey)) {
      const cached = propertiesCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`Returning cached properties (${cached.data.length} properties)`);
        return res.json({
          success: true,
          data: cached.data,
          total: cached.data.length,
          cached: true,
          loadTime: Date.now() - startTime
        });
      }
      propertiesCache.delete(cacheKey);
    }
    
    const User = require('../models/User').model;
    
    // List of all databases to check for properties
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
    
    // Get all users from the main database to check their databases
    const users = await User.find({ role: 'agent' }).select('databaseName');
    
    // Add user databases to the list
    users.forEach(user => {
      if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
        databasesToCheck.push(user.databaseName);
      }
    });
    
    console.log(`Fetching properties from ${databasesToCheck.length} databases in parallel...`);
    
    // Fetch properties from all databases in parallel
    const propertyPromises = databasesToCheck.map(databaseName => 
      fetchPropertiesFromDatabase(databaseName)
    );
    
    const results = await Promise.allSettled(propertyPromises);
    
    // Combine all properties
    let allProperties = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allProperties = allProperties.concat(result.value);
      } else {
        console.error(`Failed to fetch from database ${databasesToCheck[index]}:`, result.reason);
      }
    });
    
    // Cache the results
    propertiesCache.set(cacheKey, {
      data: allProperties,
      timestamp: Date.now()
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`Loaded ${allProperties.length} properties in ${loadTime}ms`);
    
    res.json({
      success: true,
      data: allProperties,
      total: allProperties.length,
      databases: databasesToCheck.length,
      loadTime: loadTime,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching all properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties from all databases',
      error: error.message
    });
  }
});

// GET /api/properties/all-properties - Get all properties from all databases with detailed info
router.get('/all-properties', async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('=== FETCHING ALL PROPERTIES FROM ALL DATABASES ===');
    
    const User = require('../models/User').model;
    
    // List of all databases to check for properties
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
    
    // Get all users from the main database to check their databases
    const users = await User.find({ role: 'agent' }).select('databaseName');
    
    // Add user databases to the list
    users.forEach(user => {
      if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
        databasesToCheck.push(user.databaseName);
      }
    });
    
    console.log(`Checking ${databasesToCheck.length} databases for properties...`);
    
    // Fetch properties from all databases in parallel with detailed results
    const databaseResults = await Promise.allSettled(
      databasesToCheck.map(async (databaseName) => {
        try {
          const properties = await fetchPropertiesFromDatabase(databaseName);
          return {
            databaseName,
            success: true,
            properties,
            count: properties.length,
            error: null
          };
        } catch (error) {
          console.error(`Error fetching from database ${databaseName}:`, error.message);
          return {
            databaseName,
            success: false,
            properties: [],
            count: 0,
            error: error.message
          };
        }
      })
    );
    
    // Process results
    let allProperties = [];
    let successfulDatabases = 0;
    let failedDatabases = 0;
    const databaseSummary = [];
    
    databaseResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const dbResult = result.value;
        databaseSummary.push({
          database: dbResult.databaseName,
          success: dbResult.success,
          propertyCount: dbResult.count,
          error: dbResult.error
        });
        
        if (dbResult.success) {
          allProperties = allProperties.concat(dbResult.properties);
          successfulDatabases++;
        } else {
          failedDatabases++;
        }
      } else {
        failedDatabases++;
        databaseSummary.push({
          database: 'unknown',
          success: false,
          propertyCount: 0,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`=== RESULTS ===`);
    console.log(`Total properties found: ${allProperties.length}`);
    console.log(`Successful databases: ${successfulDatabases}`);
    console.log(`Failed databases: ${failedDatabases}`);
    console.log(`Load time: ${loadTime}ms`);
    
    res.json({
      success: true,
      data: {
        properties: allProperties,
        summary: {
          totalProperties: allProperties.length,
          totalDatabases: databasesToCheck.length,
          successfulDatabases,
          failedDatabases,
          loadTime
        },
        databaseDetails: databaseSummary,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching all properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties from all databases',
      error: error.message
    });
  }
});

// GET /api/properties/:id - Get property by ID
router.get('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const property = await models.Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: error.message
    });
  }
});

// POST /api/properties - Create new property with file uploads
router.post('/', upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    console.log('=== PROPERTY CREATION STARTED ===');
    console.log('Received request body:', req.body);
    console.log('Files received:', req.files);
    
    // Parse form data - handle both JSON and FormData
    let propertyData;
    
    if (req.body.address && typeof req.body.address === 'string') {
      // FormData case - parse JSON strings
      propertyData = {
        name: req.body.name,
        propertyType: req.body.propertyType,
        address: JSON.parse(req.body.address || '{}'),
        coordinates: JSON.parse(req.body.coordinates || '{"lat": null, "lng": null}'),
        size: JSON.parse(req.body.size || '{}'),
        rent_price: parseFloat(req.body.rent_price) || 0,
        status: req.body.status || 'Available',
        description: req.body.description || '',
        features: req.body.features || '',
        yearBuilt: parseInt(req.body.yearBuilt) || null,
        parking: req.body.parking || '',
        petFriendly: req.body.petFriendly === 'true',
        furnished: req.body.furnished === 'true',
        images: [], // Will be populated with file URLs
        pdf: '', // Will be populated with PDF URL
        defects: [],
        objectId: req.body.objectId || null, // Link property to an object if provided
        unitId: req.body.unitId || null // Link property to a unit if provided
      };
    } else {
      // Direct JSON case
      propertyData = {
        name: req.body.name,
        propertyType: req.body.propertyType,
        address: req.body.address || {},
        coordinates: req.body.coordinates || { lat: null, lng: null },
        size: req.body.size || {},
        rent_price: parseFloat(req.body.rent_price) || 0,
        status: req.body.status || 'Available',
        description: req.body.description || '',
        features: req.body.features || '',
        yearBuilt: parseInt(req.body.yearBuilt) || null,
        parking: req.body.parking || '',
        petFriendly: req.body.petFriendly === 'true',
        furnished: req.body.furnished === 'true',
        images: [],
        pdf: '',
        defects: [],
        objectId: req.body.objectId || null, // Link property to an object if provided
        unitId: req.body.unitId || null // Link property to a unit if provided
      };
    }
    
    // Handle uploaded images - save to MongoDB GridFS
    if (req.files && req.files.images) {
      console.log('Processing images:', req.files.images.length);
      if (!req.user || !req.user.databaseName) {
        return res.status(401).json({ success: false, message: 'User database not found' });
      }
      const databaseName = req.user.databaseName;
      const { saveImageToGridFS } = require('../services/imageStorage');
      
      const imageIds = await Promise.all(
        req.files.images.map(file => 
          saveImageToGridFS(
            file.buffer,
            file.originalname || 'image.jpg',
            file.mimetype,
            databaseName
          )
        )
      );
      propertyData.images = imageIds.map(id => `/api/images/${id}`);
    }
    
    // Handle uploaded PDF - save to MongoDB GridFS
    if (req.files && req.files.pdf && req.files.pdf.length > 0) {
      console.log('Processing PDF:', req.files.pdf[0].originalname);
      if (!req.user || !req.user.databaseName) {
        return res.status(401).json({ success: false, message: 'User database not found' });
      }
      const databaseName = req.user.databaseName;
      const { saveImageToGridFS } = require('../services/imageStorage');
      const pdfFile = req.files.pdf[0];
      
      const pdfId = await saveImageToGridFS(
        pdfFile.buffer,
        pdfFile.originalname || 'document.pdf',
        pdfFile.mimetype,
        databaseName
      );
      propertyData.pdf = `/api/images/${pdfId}`;
    }
    
    console.log('Final property data:', propertyData);

    const property = new models.Property(propertyData);
    await property.save();
    
    // Add property to JSON file
    try {
      await jsonFileService.addProperty(property.toObject());
      console.log('Property added to JSON file successfully');
    } catch (jsonError) {
      console.error('Error adding property to JSON file:', jsonError);
      // Don't fail the request if JSON update fails
    }
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('Property creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property',
      error: error.message
    });
  }
});

// PUT /api/properties/:id - Update property
router.put('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const property = await models.Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // Update property in JSON file
    try {
      await jsonFileService.updateProperty(req.params.id, property.toObject());
      console.log('Property updated in JSON file successfully');
    } catch (jsonError) {
      console.error('Error updating property in JSON file:', jsonError);
      // Don't fail the request if JSON update fails
    }
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update property',
      error: error.message
    });
  }
});

// DELETE /api/properties/:id - Delete property
router.delete('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const property = await models.Property.findByIdAndDelete(req.params.id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // Remove property from JSON file
    try {
      await jsonFileService.removeProperty(req.params.id);
      console.log('Property removed from JSON file successfully');
    } catch (jsonError) {
      console.error('Error removing property from JSON file:', jsonError);
      // Don't fail the request if JSON update fails
    }
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: error.message
    });
  }
});

// POST /api/properties/sync-json - Manually sync all properties to JSON file
router.post('/sync-json', async (req, res) => {
  try {
    console.log('Starting manual sync of all properties to JSON file...');
    
    // Get all properties from all databases (reuse existing logic)
    const User = require('../models/User').model;
    
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
    
    const users = await User.find({ role: 'agent' }).select('databaseName');
    users.forEach(user => {
      if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
        databasesToCheck.push(user.databaseName);
      }
    });
    
    // Fetch properties from all databases in parallel
    const propertyPromises = databasesToCheck.map(databaseName => 
      fetchPropertiesFromDatabase(databaseName)
    );
    
    const results = await Promise.allSettled(propertyPromises);
    
    // Combine all properties
    let allProperties = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allProperties = allProperties.concat(result.value);
      } else {
        console.error(`Failed to fetch from database ${databasesToCheck[index]}:`, result.reason);
      }
    });
    
    // Sync to JSON file
    const jsonData = await jsonFileService.syncAllProperties(allProperties);
    
    res.json({
      success: true,
      message: 'Properties synced to JSON file successfully',
      data: {
        totalProperties: allProperties.length,
        databasesChecked: databasesToCheck.length,
        jsonFilePath: jsonFileService.getFilePath(),
        lastUpdated: jsonData.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error syncing properties to JSON:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync properties to JSON file',
      error: error.message
    });
  }
});

// POST /api/properties/:id/documents - Upload document/contract to property
router.post('/:id/documents', upload.single('document'), async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    const property = await models.Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    // Save PDF to MongoDB GridFS
    if (!req.user || !req.user.databaseName) {
      return res.status(401).json({ success: false, message: 'User database not found' });
    }
    const databaseName = req.user.databaseName;
    const { saveImageToGridFS } = require('../services/imageStorage');
    
    const pdfId = await saveImageToGridFS(
      req.file.buffer,
      req.file.originalname || 'document.pdf',
      req.file.mimetype,
      databaseName
    );
    const documentUrl = `/api/images/${pdfId}`;

    // Create document object
    const newDocument = {
      name: req.body.name || req.file.originalname.replace('.pdf', ''),
      type: req.body.type || 'document',
      url: documentUrl,
      uploadDate: new Date()
    };

    // Add document to property
    if (!property.documents) {
      property.documents = [];
    }
    property.documents.push(newDocument);
    await property.save();

    // Update property in JSON file
    try {
      await jsonFileService.updateProperty(req.params.id, property.toObject());
      console.log('Property updated in JSON file successfully');
    } catch (jsonError) {
      console.error('Error updating property in JSON file:', jsonError);
      // Don't fail the request if JSON update fails
    }

    // Invalidate all caches
    invalidateAllCaches();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        property: property,
        document: newDocument
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

// GET /api/properties/json-status - Get JSON file status
router.get('/json-status', async (req, res) => {
  try {
    const fileExists = await jsonFileService.fileExists();
    const jsonData = await jsonFileService.readPropertiesFile();
    
    res.json({
      success: true,
      data: {
        fileExists,
        filePath: jsonFileService.getFilePath(),
        totalProperties: jsonData.totalCount,
        lastUpdated: jsonData.lastUpdated,
        metadata: jsonData.metadata
      }
    });
  } catch (error) {
    console.error('Error getting JSON file status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get JSON file status',
      error: error.message
    });
  }
});

module.exports = router;
