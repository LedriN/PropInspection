const express = require('express');
const { setUserDatabase, getUserModels } = require('../middleware/databaseRouter');
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');
const router = express.Router();

// Apply authentication middleware first (needed for setUserDatabase to work)
router.use(authenticateToken);

// Apply user database middleware to all routes
router.use(setUserDatabase);

// Import centralized database manager
const { DatabaseManager } = require('../middleware/databaseRouter');

// Helper function to get database connection
async function getDatabaseConnection(databaseName) {
  return await DatabaseManager.getTenantDb(databaseName);
}

// Helper function to fetch objects from a single database
async function fetchObjectsFromDatabase(databaseName) {
  try {
    const db = await getDatabaseConnection(databaseName);
    
    if (!db) {
      console.error(`Invalid database connection for ${databaseName}`);
      return [];
    }
    
    // Check for 'propertyobjects' collection (Mongoose pluralizes PropertyObject -> propertyobjects)
    // Also check alternative collection names
    const collectionNames = ['propertyobjects', 'PropertyObjects', 'property_objects'];
    let collection = null;
    let docs = [];
    
    for (const collName of collectionNames) {
      const exists = await db.listCollections({ name: collName }).hasNext();
      if (exists) {
        collection = db.collection(collName);
        docs = await collection.find({}).toArray();
        console.log(`Found ${docs.length} objects in collection '${collName}' in database '${databaseName}'`);
        break;
      }
    }
    
    if (docs.length > 0 && collection) {
      // Also fetch properties for each object
      const propertiesCollection = db.collection('properties');
      
      const objectsWithProperties = await Promise.all(
        docs.map(async (doc) => {
          // Try multiple ways to find properties linked to this object
          const objectIdStr = doc._id.toString();
          const objectIdObj = doc._id;
          
          // Try finding properties with objectId field (string or ObjectId)
          let properties = [];
          try {
            properties = await propertiesCollection.find({ 
              $or: [
                { objectId: objectIdStr },
                { objectId: objectIdObj },
                { 'object._id': objectIdStr },
                { 'object._id': objectIdObj }
              ]
            }).toArray();
          } catch (propError) {
            console.error(`Error fetching properties for object ${objectIdStr}:`, propError);
          }
          
          console.log(`Found ${properties.length} properties for object ${objectIdStr} in database ${databaseName}`);
          
          // Fetch units for this object
          let units = [];
          try {
            const unitsCollection = db.collection('units');
            const unitsDocs = await unitsCollection.find({
              $or: [
                { objectId: objectIdStr },
                { objectId: objectIdObj }
              ]
            }).toArray();
            
            // Fetch properties for each unit
            units = await Promise.all(
              unitsDocs.map(async (unitDoc) => {
                const unitIdStr = unitDoc._id.toString();
                const unitIdObj = unitDoc._id;
                
                let unitProperties = [];
                try {
                  unitProperties = await propertiesCollection.find({
                    $or: [
                      { unitId: unitIdStr },
                      { unitId: unitIdObj }
                    ]
                  }).toArray();
                } catch (propError) {
                  console.error(`Error fetching properties for unit ${unitIdStr}:`, propError);
                }
                
                return {
                  _id: unitDoc._id,
                  objectId: unitDoc.objectId,
                  unitNumber: unitDoc.unitNumber,
                  floor: unitDoc.floor || '',
                  description: unitDoc.description || '',
                  properties: unitProperties.map(prop => ({
                    _id: prop._id,
                    name: prop.name,
                    propertyType: prop.propertyType,
                    address: prop.address,
                    coordinates: prop.coordinates,
                    size: prop.size,
                    rent_price: prop.rent_price,
                    status: prop.status,
                    description: prop.description,
                    features: prop.features,
                    yearBuilt: prop.yearBuilt,
                    parking: prop.parking,
                    petFriendly: prop.petFriendly,
                    furnished: prop.furnished,
                    images: prop.images || [],
                    pdf: prop.pdf || '',
                    defects: prop.defects || [],
                    createdAt: prop.createdAt,
                    updatedAt: prop.updatedAt
                  })),
                  createdAt: unitDoc.createdAt,
                  updatedAt: unitDoc.updatedAt
                };
              })
            );
          } catch (unitsError) {
            console.error(`Error fetching units for object ${objectIdStr}:`, unitsError);
          }
          
          // Return object with all fields, including empty properties array if none found
          return {
            _id: doc._id,
            name: doc.name || '',
            description: doc.description || '',
            address: doc.address || {},
            units: units, // Units with their properties
            properties: properties.filter(prop => !prop.unitId).map(prop => ({
              _id: prop._id,
              name: prop.name,
              propertyType: prop.propertyType,
              address: prop.address,
              coordinates: prop.coordinates,
              size: prop.size,
              rent_price: prop.rent_price,
              status: prop.status,
              description: prop.description,
              features: prop.features,
              yearBuilt: prop.yearBuilt,
              parking: prop.parking,
              petFriendly: prop.petFriendly,
              furnished: prop.furnished,
              images: prop.images || [],
              pdf: prop.pdf || '',
              defects: prop.defects || [],
              createdAt: prop.createdAt,
              updatedAt: prop.updatedAt
            })),
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            _database: {
              name: databaseName,
              source: 'database'
            }
          };
        })
      );
      
      return objectsWithProperties;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching objects from ${databaseName}:`, error.message);
    return [];
  }
}

// GET /api/objects - Get all objects from all databases
router.get('/', async (req, res) => {
  try {
    const User = require('../models/User').model;
    
    // List of all databases to check for objects
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
    
    // Add current user's database if available
    if (req.user && req.user.databaseName && !databasesToCheck.includes(req.user.databaseName)) {
      databasesToCheck.push(req.user.databaseName);
      console.log(`Added current user's database: ${req.user.databaseName}`);
    }
    
    // Get all users from the main database to check their databases
    const users = await User.find({ role: 'agent' }).select('databaseName');
    
    // Add user databases to the list
    users.forEach(user => {
      if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
        databasesToCheck.push(user.databaseName);
      }
    });
    
    console.log(`Fetching objects from ${databasesToCheck.length} databases in parallel...`);
    
    // Fetch objects from all databases in parallel
    const objectPromises = databasesToCheck.map(databaseName => 
      fetchObjectsFromDatabase(databaseName)
    );
    
    const results = await Promise.allSettled(objectPromises);
    
    // Combine all objects
    let allObjects = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const objectsFromDb = result.value || [];
        console.log(`Database ${databasesToCheck[index]}: Found ${objectsFromDb.length} objects`);
        allObjects = allObjects.concat(objectsFromDb);
      } else {
        console.error(`Failed to fetch objects from ${databasesToCheck[index]}:`, result.reason);
      }
    });
    
    console.log(`Total objects found across all databases: ${allObjects.length}`);
    console.log('Sample object:', allObjects.length > 0 ? JSON.stringify(allObjects[0], null, 2) : 'No objects');
    
    res.json({
      success: true,
      data: allObjects,
      total: allObjects.length
    });
  } catch (error) {
    console.error('Error fetching objects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch objects',
      error: error.message
    });
  }
});

// GET /api/objects/:id - Get object by ID
router.get('/:id', async (req, res) => {
  try {
    const User = require('../models/User').model;
    
    // List of all databases to check for objects
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
    
    // Add current user's database if available
    if (req.user && req.user.databaseName && !databasesToCheck.includes(req.user.databaseName)) {
      databasesToCheck.push(req.user.databaseName);
    }
    
    // Get all users from the main database to check their databases
    const users = await User.find({ role: 'agent' }).select('databaseName');
    
    // Add user databases to the list
    users.forEach(user => {
      if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
        databasesToCheck.push(user.databaseName);
      }
    });
    
    // Search for the object across all databases
    let foundObject = null;
    
    for (const databaseName of databasesToCheck) {
      try {
        const db = await getDatabaseConnection(databaseName);
        if (!db) continue;
        
        // Check for 'propertyobjects' collection (Mongoose pluralizes PropertyObject -> propertyobjects)
        const collectionNames = ['propertyobjects', 'PropertyObjects', 'property_objects'];
        let collection = null;
        let doc = null;
        
        for (const collName of collectionNames) {
          const exists = await db.listCollections({ name: collName }).hasNext();
          if (exists) {
            collection = db.collection(collName);
            try {
              doc = await collection.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
            } catch (idError) {
              doc = await collection.findOne({ _id: req.params.id });
            }
            if (doc) break;
          }
        }
        
        if (doc) {
          // Fetch properties for this object
          const propertiesCollection = db.collection('properties');
          const objectIdStr = doc._id.toString();
          const objectIdObj = doc._id;
          
          let properties = [];
          try {
            properties = await propertiesCollection.find({ 
              $or: [
                { objectId: objectIdStr },
                { objectId: objectIdObj },
                { 'object._id': objectIdStr },
                { 'object._id': objectIdObj }
              ]
            }).toArray();
          } catch (propError) {
            console.error(`Error fetching properties for object ${objectIdStr}:`, propError);
          }
          
          console.log(`Found object ${req.params.id} in database ${databaseName} with ${properties.length} properties`);
          
          // Fetch units for this object
          let units = [];
          try {
            const unitsCollection = db.collection('units');
            const unitsDocs = await unitsCollection.find({
              $or: [
                { objectId: req.params.id },
                { objectId: new mongoose.Types.ObjectId(req.params.id) }
              ]
            }).toArray();
            
            // Fetch properties for each unit
            units = await Promise.all(
              unitsDocs.map(async (unitDoc) => {
                const unitIdStr = unitDoc._id.toString();
                const unitIdObj = unitDoc._id;
                
                let unitProperties = [];
                try {
                  unitProperties = await propertiesCollection.find({
                    $or: [
                      { unitId: unitIdStr },
                      { unitId: unitIdObj }
                    ]
                  }).toArray();
                } catch (propError) {
                  console.error(`Error fetching properties for unit ${unitIdStr}:`, propError);
                }
                
                return {
                  _id: unitDoc._id,
                  objectId: unitDoc.objectId,
                  unitNumber: unitDoc.unitNumber,
                  floor: unitDoc.floor || '',
                  description: unitDoc.description || '',
                  properties: unitProperties.map(prop => ({
                    _id: prop._id,
                    name: prop.name,
                    propertyType: prop.propertyType,
                    address: prop.address,
                    coordinates: prop.coordinates,
                    size: prop.size,
                    rent_price: prop.rent_price,
                    status: prop.status,
                    description: prop.description,
                    features: prop.features,
                    yearBuilt: prop.yearBuilt,
                    parking: prop.parking,
                    petFriendly: prop.petFriendly,
                    furnished: prop.furnished,
                    images: prop.images || [],
                    pdf: prop.pdf || '',
                    defects: prop.defects || [],
                    createdAt: prop.createdAt,
                    updatedAt: prop.updatedAt
                  })),
                  createdAt: unitDoc.createdAt,
                  updatedAt: unitDoc.updatedAt
                };
              })
            );
          } catch (unitsError) {
            console.error(`Error fetching units for object ${req.params.id}:`, unitsError);
          }
          
          foundObject = {
            _id: doc._id,
            name: doc.name || '',
            description: doc.description || '',
            address: doc.address || {},
            units: units, // Units with their properties
            properties: properties.filter(prop => !prop.unitId).map(prop => ({
              _id: prop._id,
              name: prop.name,
              propertyType: prop.propertyType,
              address: prop.address,
              coordinates: prop.coordinates,
              size: prop.size,
              rent_price: prop.rent_price,
              status: prop.status,
              description: prop.description,
              features: prop.features,
              yearBuilt: prop.yearBuilt,
              parking: prop.parking,
              petFriendly: prop.petFriendly,
              furnished: prop.furnished,
              images: prop.images || [],
              pdf: prop.pdf || '',
              defects: prop.defects || [],
              createdAt: prop.createdAt,
              updatedAt: prop.updatedAt
            })),
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            _database: {
              name: databaseName,
              source: 'database'
            }
          };
          break; // Found it, stop searching
        }
      } catch (error) {
        console.error(`Error searching database ${databaseName}:`, error);
        continue;
      }
    }
    
    if (!foundObject) {
      return res.status(404).json({
        success: false,
        message: 'Object not found'
      });
    }
    
    res.json({
      success: true,
      data: foundObject
    });
  } catch (error) {
    console.error('Error fetching object:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch object',
      error: error.message
    });
  }
});

// POST /api/objects - Create new object
router.post('/', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    const objectData = {
      name: req.body.name,
      description: req.body.description || '',
      address: req.body.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Switzerland'
      }
    };
    
    // Try to use PropertyObject model, if it doesn't exist, use direct collection access
    let object;
    try {
      object = new models.PropertyObject(objectData);
      await object.save();
    } catch (error) {
      // If model doesn't exist, use direct collection access
      const db = await getDatabaseConnection(req.user.databaseName);
      if (!db) {
        return res.status(500).json({
          success: false,
          message: 'Database connection failed'
        });
      }
      
      const collection = db.collection('propertyobjects');
      const result = await collection.insertOne({
        ...objectData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      object = {
        _id: result.insertedId,
        ...objectData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    res.status(201).json({
      success: true,
      message: 'Object created successfully',
      data: object
    });
  } catch (error) {
    console.error('Object creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create object',
      error: error.message
    });
  }
});

// PUT /api/objects/:id - Update object
router.put('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      address: req.body.address,
      updatedAt: new Date()
    };
    
    // Try to use PropertyObject model, if it doesn't exist, use direct collection access
    let object;
    try {
      object = await models.PropertyObject.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      // If model doesn't exist, use direct collection access
      const db = await getDatabaseConnection(req.user.databaseName);
      if (!db) {
        return res.status(500).json({
          success: false,
          message: 'Database connection failed'
        });
      }
      
      const collection = db.collection('propertyobjects');
      let result;
      try {
        result = await collection.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(req.params.id) },
          { $set: updateData },
          { returnDocument: 'after' }
        );
      } catch (idError) {
        result = await collection.findOneAndUpdate(
          { _id: req.params.id },
          { $set: updateData },
          { returnDocument: 'after' }
        );
      }
      
      if (!result.value) {
        return res.status(404).json({
          success: false,
          message: 'Object not found'
        });
      }
      
      object = result.value;
    }
    
    if (!object) {
      return res.status(404).json({
        success: false,
        message: 'Object not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Object updated successfully',
      data: object
    });
  } catch (error) {
    console.error('Object update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update object',
      error: error.message
    });
  }
});

// DELETE /api/objects/:id - Delete object
router.delete('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    // Try to use PropertyObject model, if it doesn't exist, use direct collection access
    let object;
    try {
      object = await models.PropertyObject.findById(req.params.id);
      if (object) {
        await models.PropertyObject.findByIdAndDelete(req.params.id);
      }
    } catch (error) {
      // If model doesn't exist, use direct collection access
      const db = await getDatabaseConnection(req.user.databaseName);
      if (!db) {
        return res.status(500).json({
          success: false,
          message: 'Database connection failed'
        });
      }
      
      const collection = db.collection('propertyobjects');
      let objectId;
      try {
        objectId = new mongoose.Types.ObjectId(req.params.id);
      } catch (idError) {
        objectId = req.params.id;
      }
      object = await collection.findOne({ _id: objectId });
      
      if (object) {
        await collection.deleteOne({ _id: objectId });
      }
    }
    
    if (!object) {
      return res.status(404).json({
        success: false,
        message: 'Object not found'
      });
    }
    
    // Optionally delete all properties associated with this object
    // Uncomment if you want to cascade delete properties
    // try {
    //   const propertiesCollection = dbConnection.db.collection('properties');
    //   await propertiesCollection.deleteMany({ objectId: req.params.id });
    // } catch (error) {
    //   console.error('Error deleting associated properties:', error);
    // }
    
    res.json({
      success: true,
      message: 'Object deleted successfully'
    });
  } catch (error) {
    console.error('Object deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete object',
      error: error.message
    });
  }
});

module.exports = router;

