const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { saveImageToGridFS, getImageFromGridFS } = require('../services/imageStorage');

// Import route modules
const authRoutes = require('./auth');
const propertyRoutes = require('./properties');
const objectRoutes = require('./objects');
const unitRoutes = require('./units');
const clientRoutes = require('./clients');
const agentRoutes = require('./agents');
const agentDataRoutes = require('./agentData');
const inspectionRoutes = require('./inspections');
const reportRoutes = require('./reports');
const statsRoutes = require('./stats');
const { upload } = require('../middleware/upload');

// Mount routes
router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/objects', objectRoutes);
router.use('/units', unitRoutes);
router.use('/clients', clientRoutes);
router.use('/agents', agentRoutes);
router.use('/agent-data', agentDataRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/reports', reportRoutes);
router.use('/stats', statsRoutes);

// Generic image upload endpoint - saves to MongoDB GridFS
// Accepts field name 'image' (single) or 'images' (array), returns image IDs
router.post('/upload/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    
    if (!req.user || !req.user.databaseName) {
      return res.status(401).json({ success: false, message: 'User database not found' });
    }
    
    const file = req.file;
    const databaseName = req.user.databaseName;
    
    // Save to MongoDB GridFS
    const imageId = await saveImageToGridFS(
      file.buffer,
      file.originalname || 'image.jpg',
      file.mimetype,
      databaseName
    );
    
    const url = `/api/images/${imageId}`;
    return res.json({ 
      success: true, 
      url,
      imageId,
      file: { 
        originalname: file.originalname, 
        mimetype: file.mimetype, 
        size: file.size 
      } 
    });
  } catch (e) {
    console.error('Error uploading image:', e);
    return res.status(500).json({ success: false, message: 'Failed to upload image', error: e.message });
  }
});

router.post('/upload/images', authenticateToken, upload.array('images', 50), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ success: false, message: 'No image files uploaded' });
    }
    
    if (!req.user || !req.user.databaseName) {
      return res.status(401).json({ success: false, message: 'User database not found' });
    }
    
    const databaseName = req.user.databaseName;
    const uploadPromises = req.files.map(file => 
      saveImageToGridFS(
        file.buffer,
        file.originalname || 'image.jpg',
        file.mimetype,
        databaseName
      )
    );
    
    const imageIds = await Promise.all(uploadPromises);
    const urls = imageIds.map(id => `/api/images/${id}`);
    
    return res.json({ success: true, urls, imageIds });
  } catch (e) {
    console.error('Error uploading images:', e);
    return res.status(500).json({ success: false, message: 'Failed to upload images', error: e.message });
  }
});

// GET /api/images/:imageId - Fetch and serve images from MongoDB GridFS
// Public endpoint - images can be accessed without authentication
router.get('/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    // Validate that imageId looks like a MongoDB ObjectId (24 hex characters)
    if (!/^[a-f\d]{24}$/i.test(imageId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid image ID format. Expected MongoDB ObjectId.' 
      });
    }
    
    // Try to get database name from authenticated user first, then from query param
    let databaseName = null;
    
    // Try authentication first (if token is provided)
    try {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const jwt = require('jsonwebtoken');
          const User = require('../models/User').model;
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.userId);
          if (user && user.databaseName) {
            databaseName = user.databaseName;
          }
        }
      }
    } catch (authError) {
      // Auth failed, continue to try other methods
      console.log('Auth check failed, trying alternative methods');
    }
    
    // If still no database name, try query parameter (for public access)
    if (!databaseName && req.query.db) {
      databaseName = req.query.db;
    }
    
    // If still no database name, try to find image by searching all databases
    // This is less efficient but allows public access
    if (!databaseName) {
      try {
        const { findImageInAnyDatabase } = require('../services/imageStorage');
        const result = await findImageInAnyDatabase(imageId);
        const { buffer, contentType } = result;
        
        // Set appropriate headers
        res.setHeader('Content-Type', contentType || 'image/jpeg');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Send the image buffer
        return res.send(buffer);
      } catch (searchError) {
        return res.status(404).json({ 
          success: false, 
          message: 'Image not found. Database could not be determined.' 
        });
      }
    }
    
    // Get image from MongoDB GridFS
    const { buffer, contentType } = await getImageFromGridFS(imageId, databaseName);
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Send the image buffer
    res.send(buffer);
    
  } catch (error) {
    console.error('Error serving image:', error);
    if (!res.headersSent) {
      res.status(error.message.includes('not found') ? 404 : 500).json({ 
        success: false, 
        message: error.message || 'Failed to serve image' 
      });
    }
  }
});

// Legacy endpoint support: /api/images/:date/:filename (for backward compatibility)
router.get('/images/:date/:filename', authenticateToken, async (req, res) => {
  const { date, filename } = req.params;
  
  // If the filename looks like an ObjectId (24 hex characters), try to use it as imageId
  if (/^[a-f\d]{24}$/i.test(filename)) {
    // Redirect to the new format
    return res.redirect(`/api/images/${filename}`);
  }
  
  // Otherwise, return 404 as the file doesn't exist in the new system
  res.status(404).json({ 
    success: false, 
    message: 'Legacy image format not supported. Image may have been migrated to MongoDB.' 
  });
});

// GET /api/images/list - List all available images from MongoDB GridFS (for debugging/admin purposes)
router.get('/images/list', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.databaseName) {
      return res.status(401).json({ success: false, message: 'User database not found' });
    }
    
    const databaseName = req.user.databaseName;
    const { getTenantDb } = require('../db');
    const { GridFSBucket } = require('mongodb');
    
    const db = await getTenantDb(databaseName);
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Find all images
    const files = await bucket.find({}).toArray();
    
    const images = files.map(file => ({
      id: file._id.toString(),
      filename: file.filename,
      contentType: file.contentType,
      uploadDate: file.uploadDate,
      length: file.length,
      url: `/api/images/${file._id.toString()}`
    }));
    
    res.json({ 
      success: true, 
      images,
      total: images.length 
    });
    
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ success: false, message: 'Failed to list images', error: error.message });
  }
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Property Inspection API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      properties: '/api/properties',
      objects: '/api/objects',
      clients: '/api/clients',
      agents: '/api/agents',
      agentData: '/api/agent-data',
      inspections: '/api/inspections',
      reports: '/api/reports',
      stats: '/api/stats'
    }
  });
});

module.exports = router;
