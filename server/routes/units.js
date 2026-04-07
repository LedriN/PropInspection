const express = require('express');
const { setUserDatabase, getUserModels } = require('../middleware/databaseRouter');
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');
const router = express.Router();

// Apply authentication middleware first
router.use(authenticateToken);

// Apply user database middleware to all routes
router.use(setUserDatabase);

// Import centralized database manager
const { DatabaseManager } = require('../middleware/databaseRouter');

// Helper function to get database connection
async function getDatabaseConnection(databaseName) {
  return await DatabaseManager.getTenantDb(databaseName);
}

// GET /api/units?objectId=xxx - Get all units for an object
router.get('/', async (req, res) => {
  try {
    const objectId = req.query.objectId;
    
    if (!objectId) {
      return res.status(400).json({
        success: false,
        message: 'objectId query parameter is required'
      });
    }

    const User = require('../models/User').model;
    const databasesToCheck = [
      'admin', 'config', 'donaldtrump', 'janesmith', 'johndoe',
      'ledribaba', 'ledrinushi', 'lolakacurri', 'luancoli', 'propinspection_users'
    ];
    
    if (req.user && req.user.databaseName && !databasesToCheck.includes(req.user.databaseName)) {
      databasesToCheck.push(req.user.databaseName);
    }
    
    const users = await User.find({ role: 'agent' }).select('databaseName');
    users.forEach(user => {
      if (user.databaseName && !databasesToCheck.includes(user.databaseName)) {
        databasesToCheck.push(user.databaseName);
      }
    });
    
    let allUnits = [];
    
    for (const databaseName of databasesToCheck) {
      try {
        const db = await getDatabaseConnection(databaseName);
        if (!db) continue;
        
        const collectionNames = ['units', 'Units', 'buildingunits'];
        let units = [];
        
        for (const collName of collectionNames) {
          const exists = await db.listCollections({ name: collName }).hasNext();
          if (exists) {
            const collection = db.collection(collName);
            try {
              units = await collection.find({ 
                $or: [
                  { objectId: objectId },
                  { objectId: new mongoose.Types.ObjectId(objectId) }
                ]
              }).toArray();
            } catch (error) {
              units = await collection.find({ objectId: objectId }).toArray();
            }
            
            if (units.length > 0) {
              // Fetch properties for each unit
              const propertiesCollection = db.collection('properties');
              
              const unitsWithProperties = await Promise.all(
                units.map(async (unit) => {
                  const unitIdStr = unit._id.toString();
                  const unitIdObj = unit._id;
                  
                  let properties = [];
                  try {
                    properties = await propertiesCollection.find({
                      $or: [
                        { unitId: unitIdStr },
                        { unitId: unitIdObj }
                      ]
                    }).toArray();
                  } catch (propError) {
                    console.error(`Error fetching properties for unit ${unitIdStr}:`, propError);
                  }
                  
                  return {
                    _id: unit._id,
                    objectId: unit.objectId,
                    unitNumber: unit.unitNumber,
                    floor: unit.floor || '',
                    description: unit.description || '',
                    properties: properties.map(prop => ({
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
                    createdAt: unit.createdAt,
                    updatedAt: unit.updatedAt
                  };
                })
              );
              
              allUnits = allUnits.concat(unitsWithProperties);
              break; // Found collection, stop searching
            }
          }
        }
      } catch (error) {
        console.error(`Error searching database ${databaseName}:`, error);
        continue;
      }
    }
    
    res.json({
      success: true,
      data: allUnits,
      total: allUnits.length
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units',
      error: error.message
    });
  }
});

// POST /api/units - Create new unit
router.post('/', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    const unitData = {
      objectId: req.body.objectId,
      unitNumber: req.body.unitNumber,
      floor: req.body.floor || '',
      description: req.body.description || ''
    };
    
    let unit;
    try {
      unit = new models.Unit(unitData);
      await unit.save();
    } catch (error) {
      // If model doesn't exist, use direct collection access
      const db = await getDatabaseConnection(req.user.databaseName);
      if (!db) {
        return res.status(500).json({
          success: false,
          message: 'Database connection failed'
        });
      }
      
      const collection = db.collection('units');
      const result = await collection.insertOne({
        ...unitData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      unit = {
        _id: result.insertedId,
        ...unitData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit
    });
  } catch (error) {
    console.error('Unit creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create unit',
      error: error.message
    });
  }
});

// PUT /api/units/:id - Update unit
router.put('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    const updateData = {
      unitNumber: req.body.unitNumber,
      floor: req.body.floor,
      description: req.body.description,
      updatedAt: new Date()
    };
    
    let unit;
    try {
      unit = await models.Unit.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      const db = await getDatabaseConnection(req.user.databaseName);
      if (!db) {
        return res.status(500).json({
          success: false,
          message: 'Database connection failed'
        });
      }
      
      const collection = db.collection('units');
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
          message: 'Unit not found'
        });
      }
      
      unit = result.value;
    }
    
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: unit
    });
  } catch (error) {
    console.error('Unit update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update unit',
      error: error.message
    });
  }
});

// DELETE /api/units/:id - Delete unit
router.delete('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    let unit;
    try {
      unit = await models.Unit.findById(req.params.id);
      if (unit) {
        await models.Unit.findByIdAndDelete(req.params.id);
      }
    } catch (error) {
      const db = await getDatabaseConnection(req.user.databaseName);
      if (!db) {
        return res.status(500).json({
          success: false,
          message: 'Database connection failed'
        });
      }
      
      const collection = db.collection('units');
      let objectId;
      try {
        objectId = new mongoose.Types.ObjectId(req.params.id);
      } catch (idError) {
        objectId = req.params.id;
      }
      unit = await collection.findOne({ _id: objectId });
      
      if (unit) {
        await collection.deleteOne({ _id: objectId });
      }
    }
    
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    console.error('Unit deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete unit',
      error: error.message
    });
  }
});

module.exports = router;

