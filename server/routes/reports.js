const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { setUserDatabase, getUserModels } = require('../middleware/databaseRouter');
const { upload } = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Test endpoints (no middleware required)
router.get('/test-email-config', async (req, res) => {
  try {
    const emailService = require('../services/emailService');
    
    // Check if Resend is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    
    res.json({
      success: true,
      resendConfigured: !!resendApiKey,
      apiKeyPresent: !!resendApiKey,
      apiKeyLength: resendApiKey ? resendApiKey.length : 0,
      environment: process.env.NODE_ENV,
      message: resendApiKey ? 'Resend is configured' : 'Resend API key is missing'
    });
  } catch (error) {
    console.error('Error testing email config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/test-email', async (req, res) => {
  try {
    const emailService = require('../services/emailService');
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        error: 'testEmail is required'
      });
    }
    
    const result = await emailService.sendInspectionReport(
      testEmail,
      'Test Email from Property Inspection Dashboard',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Test Email</h2>
          <p>This is a test email from your Property Inspection Dashboard.</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p><strong>Server:</strong> ${req.get('host')}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p>If you received this email, your email system is working correctly!</p>
        </div>
      `
    );
    
    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
      details: result
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Apply user database middleware to all routes
router.use(setUserDatabase);

// Apply authentication middleware to all routes except test endpoints
router.use((req, res, next) => {
  if (req.path === '/test' || req.path === '/test-email-config' || req.path === '/test-email') {
    return next(); // Skip auth for test endpoints
  }
  return authenticateToken(req, res, next);
});

// Helper function to invalidate all caches (no longer needed but kept for compatibility)
const invalidateAllCaches = () => {
  console.log('Cache invalidation called (caching disabled)');
};

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

// Import centralized database manager
const { DatabaseManager } = require('../middleware/databaseRouter');

// Helper function to get or create database connection (now uses centralized manager)
async function getDatabaseConnection(databaseName) {
  return DatabaseManager.getTenantConnection(databaseName);
}

// Test endpoint to verify server is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Reports endpoint is working', timestamp: new Date().toISOString() });
});

// GET /api/reports - Get all reports with pagination (no caching for real-time updates)
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    console.log('=== FETCHING REPORTS ===');
    console.log('User database:', req.userDatabase);
    console.log('Current user:', req.user);
    console.log('Pagination:', { page, limit, skip });
    
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    let allReports = [];
    let totalCount = 0;
    
    // If user is admin, fetch from ALL databases
    if (currentUser.role === 'admin') {
      console.log('Admin user detected - fetching from all databases');
      
      const databasesToCheck = await getDynamicDatabases();
      console.log(`Checking ${databasesToCheck.length} databases for reports`);
      
      // First, get total count from all databases
      for (const databaseName of databasesToCheck) {
        try {
          const dbConnection = await getDatabaseConnection(databaseName);
          
          // Register models on this connection if not already registered
          if (!dbConnection.models || !dbConnection.models.Report) {
            const ReportModel = dbConnection.model('Report', require('../models/Report').schema);
            dbConnection.models = dbConnection.models || {};
            dbConnection.models.Report = ReportModel;
          }
          
          if (dbConnection && dbConnection.models && dbConnection.models.Report) {
            const count = await dbConnection.models.Report.countDocuments({});
            totalCount += count;
            console.log(`Found ${count} reports in ${databaseName}`);
          }
        } catch (dbError) {
          console.error(`Error counting reports in database ${databaseName}:`, dbError.message);
        }
      }
      
      // Now fetch paginated results from all databases
      for (const databaseName of databasesToCheck) {
        try {
          console.log(`Fetching reports from database: ${databaseName}`);
          const dbConnection = await getDatabaseConnection(databaseName);
          
          if (dbConnection && dbConnection.models && dbConnection.models.Report) {
            const reports = await dbConnection.models.Report.find({})
              .sort({ generated_at: -1 })
              .lean() // Use lean() for better performance
              .select('_id title report_type property_name client_name agent_name agent_email client_email status generated_at generated_by created_at updated_at'); // Only select needed fields
            
            // Add database source to each report
            const reportsWithSource = reports.map(report => ({
              ...report,
              _sourceDatabase: databaseName
            }));
            
            allReports = allReports.concat(reportsWithSource);
          }
        } catch (dbError) {
          console.error(`Error fetching from database ${databaseName}:`, dbError.message);
        }
      }
      
      // Sort all reports by generation date
      allReports.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
      
      // Apply pagination to the sorted results
      const paginatedReports = allReports.slice(skip, skip + limit);
      allReports = paginatedReports;
      
    } else {
      // For non-admin users, fetch only from their own database
      console.log('Non-admin user - fetching from own database only');
      console.log('Current user info:', {
        _id: currentUser._id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        username: currentUser.username,
        databaseName: currentUser.databaseName
      });
      const models = getUserModels(req.userDatabase);
      
      // Get total count first
      totalCount = await models.Report.countDocuments({
        $or: [
          { 'agent_id._id': currentUser._id },
          { 'agent_id': currentUser._id },
          { 'agent_name': `${currentUser.firstName} ${currentUser.lastName}` },
          { 'agent_name': currentUser.email },
          { 'agent_name': currentUser.databaseName },
          { 'agent_name': currentUser.username }, // Add username matching
          { 'generated_by': currentUser.databaseName },
          { 'generated_by': currentUser.email },
          { 'generated_by': currentUser.username }, // Add username matching for generated_by
          // Include system-generated reports for this user's database
          { 'generated_by': 'system', 'agent_name': currentUser.username },
          { 'generated_by': 'system', 'agent_name': currentUser.databaseName },
          { 'generated_by': 'system', 'agent_name': currentUser.email }
        ]
      });
      
      // Find reports created by the current user with pagination
      const reports = await models.Report.find({
        $or: [
          { 'agent_id._id': currentUser._id },
          { 'agent_id': currentUser._id },
          { 'agent_name': `${currentUser.firstName} ${currentUser.lastName}` },
          { 'agent_name': currentUser.email },
          { 'agent_name': currentUser.databaseName },
          { 'agent_name': currentUser.username }, // Add username matching
          { 'generated_by': currentUser.databaseName },
          { 'generated_by': currentUser.email },
          { 'generated_by': currentUser.username }, // Add username matching for generated_by
          // Include system-generated reports for this user's database
          { 'generated_by': 'system', 'agent_name': currentUser.username },
          { 'generated_by': 'system', 'agent_name': currentUser.databaseName },
          { 'generated_by': 'system', 'agent_name': currentUser.email }
        ]
      })
      .sort({ generated_at: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id title report_type property_name client_name agent_name agent_email client_email status generated_at generated_by created_at updated_at') // Only select needed fields
      .lean(); // Use lean() for better performance
      
      console.log(`Found ${reports.length} reports for user ${currentUser.username} (${currentUser.databaseName}) - Page ${page} of ${Math.ceil(totalCount / limit)}`);
      
      allReports = reports;
    }
    
    const loadTime = Date.now() - startTime;
    console.log(`Loaded ${allReports.length} reports in ${loadTime}ms (no cache)`);
    console.log('Reports found:', allReports.map(r => ({ 
      id: r._id, 
      title: r.title, 
      status: r.status, 
      generated_by: r.generated_by,
      source: r._sourceDatabase || req.userDatabase
    })));
    
    const totalPages = Math.ceil(totalCount / limit);
    
    res.json({
      success: true,
      data: allReports,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      cached: false,
      loadTime: loadTime,
      totalDatabases: currentUser.role === 'admin' ? (await getDynamicDatabases()).length : 1
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

// GET /api/reports/:id - Get report by ID
router.get('/:id', async (req, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    let report = null;
    let sourceDatabase = null;
    
    // If user is admin, search across ALL databases
    if (currentUser.role === 'admin') {
      console.log('Admin user - searching for report across all databases');
      
      const databasesToCheck = await getDynamicDatabases();
      console.log(`Searching ${databasesToCheck.length} databases for report ${req.params.id}`);
      
      // Search for the report in each database
      for (const databaseName of databasesToCheck) {
        try {
          console.log(`Searching for report in database: ${databaseName}`);
          const dbConnection = await getDatabaseConnection(databaseName);
          
          // Register models on this connection if not already registered
          if (!dbConnection.models || !dbConnection.models.Report) {
            console.log(`Registering models for database: ${databaseName}`);
            const ReportModel = dbConnection.model('Report', require('../models/Report').schema);
            dbConnection.models = dbConnection.models || {};
            dbConnection.models.Report = ReportModel;
          }
          
          if (dbConnection && dbConnection.models && dbConnection.models.Report) {
            const foundReport = await dbConnection.models.Report.findById(req.params.id);
            
            if (foundReport) {
              console.log(`Found report in database: ${databaseName}`);
              report = foundReport;
              sourceDatabase = databaseName;
              break; // Found, exit loop
            }
          }
        } catch (dbError) {
          console.error(`Error searching in database ${databaseName}:`, dbError.message);
          // Continue with other databases
        }
      }
      
    } else {
      // For non-admin users, search only in their own database
      console.log('Non-admin user - searching in own database only');
      const models = getUserModels(req.userDatabase);
      report = await models.Report.findById(req.params.id);
      sourceDatabase = req.userDatabase;
    }
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Add source database info to response
    const reportWithSource = {
      ...report.toObject(),
      _sourceDatabase: sourceDatabase
    };
    
    console.log('Report data being returned:', {
      id: reportWithSource._id,
      title: reportWithSource.title,
      agent_email: reportWithSource.agent_email,
      client_email: reportWithSource.client_email,
      agent_name: reportWithSource.agent_name,
      client_name: reportWithSource.client_name
    });
    
    res.json({
      success: true,
      data: reportWithSource
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report'
    });
  }
});

// POST /api/reports - Create new report
// Accept either JSON or multipart/form-data with images
router.post('/', upload.any(), async (req, res) => {
  try {
    console.log('=== REPORT CREATION STARTED ===');
    console.log('Request received at:', new Date().toISOString());
    
    const models = getUserModels(req.userDatabase);
    const mongoose = require('mongoose');
    
    console.log('Received report data (body):', req.body); // Debug log
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    
    if (req.files && req.files.length) {
      console.log('=== RECEIVED FILES ===');
      console.log('Number of files:', req.files.length);
      req.files.forEach((f, index) => {
        console.log(`File ${index + 1}:`, {
          fieldname: f.fieldname,
          filename: f.filename,
          mimetype: f.mimetype,
          size: f.size,
          path: f.path,
          originalname: f.originalname
        });
      });
    } else {
      console.log('No files received in request');
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Request body content:', req.body);
      console.log('Content-Type header:', req.headers['content-type']);
      console.log('Is multipart?', req.headers['content-type']?.includes('multipart/form-data'));
    }
    
    // If multipart, some complex fields may be JSON strings; parse safely
    function safeParse(obj, key) {
      if (!obj || obj[key] == null) return undefined;
      try {
        if (typeof obj[key] === 'string') return JSON.parse(obj[key]);
        return obj[key];
      } catch (_e) { return obj[key]; }
    }

    // Build content object and attach uploaded images map
    let content = safeParse(req.body, 'content') || {};

    // If the frontend sends inspectionData separately, include it
    const inspectionData = safeParse(req.body, 'inspectionData');
    if (inspectionData && !content.inspectionData) {
      // Validate inspectionData for local URIs before including
      const cleanedInspectionData = { ...inspectionData };
      Object.keys(cleanedInspectionData).forEach(area => {
        Object.keys(cleanedInspectionData[area]).forEach(field => {
          const fieldValue = cleanedInspectionData[area][field];
          if (Array.isArray(fieldValue)) {
            // Remove any local URIs from image arrays
            cleanedInspectionData[area][field] = fieldValue.filter(image => 
              !image.uri || !image.uri.startsWith('file://')
            );
          }
        });
      });
      content.inspectionData = cleanedInspectionData;
    }

    // Utility: save base64 data URI image to MongoDB GridFS and return URL
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

    // Utility: walk an object and replace any data:image URIs with saved URLs
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

    // Replace any signature/images data URIs in content (incl. inspectionData) with URLs
    content = await replaceDataUrisDeep(content);

    // Map uploaded files into content.images as area->field->[{ uri }]
    if (req.files && req.files.length) {
      console.log('=== PROCESSING UPLOADED FILES ===');
      console.log('Number of files received:', req.files.length);
      
      if (!req.user || !req.user.databaseName) {
        console.error('User database not found for saving images');
        return res.status(401).json({ success: false, message: 'User database not found' });
      }
      
      const databaseName = req.user.databaseName;
      const { saveImageToGridFS } = require('../services/imageStorage');
      
      // Always start with empty images object to ensure we only use uploaded files
      const images = {};
      for (const file of req.files) {
        console.log(`Processing file: ${file.fieldname}`);
        console.log(`File details:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
        
        // Expect fieldname like images[exterior][roof_images] or area_field
        // Try to extract area and field from fieldname
        let area = 'general';
        let field = file.fieldname || 'images';
        const bracketMatch = file.fieldname && file.fieldname.match(/^images\[(.+?)\]\[(.+?)\]$/);
        if (bracketMatch) {
          area = bracketMatch[1];
          field = bracketMatch[2];
          console.log(`Extracted area: ${area}, field: ${field} from bracket match`);
        } else {
          const parts = (file.fieldname || '').split('__');
          if (parts.length === 2) {
            area = parts[0];
            field = parts[1];
            console.log(`Extracted area: ${area}, field: ${field} from parts split`);
          }
        }
        
        if (!images[area]) images[area] = {};
        if (!images[area][field]) images[area][field] = [];
        
        // Save to MongoDB GridFS (file.buffer is available with memory storage)
        const imageId = await saveImageToGridFS(
          file.buffer,
          file.originalname || 'image.jpg',
          file.mimetype,
          databaseName
        );
        const fileUrl = `/api/images/${imageId}`;
        console.log(`Generated file URL: ${fileUrl}`);
        
        images[area][field].push({ 
          uri: fileUrl, 
          name: file.originalname, 
          mimetype: file.mimetype, 
          size: file.size 
        });
        
        console.log(`Added image to ${area}.${field}:`, { uri: fileUrl, name: file.originalname });
      }
      // Always overwrite content.images with uploaded files
      content.images = images;
      console.log('Final images object (overwritten with uploaded files):', JSON.stringify(images, null, 2));
    } else {
      console.log('No files to process - clearing images from content');
      console.log('This means either:');
      console.log('1. No images were selected in the form');
      console.log('2. FormData was not sent correctly from frontend');
      console.log('3. Multer did not process the files correctly');
      console.log('4. Content-Type header issue');
      console.log('5. React Native FormData compatibility issue');
      
      // Check if there are any local URIs in the content that need to be cleared
      if (content.images && Object.keys(content.images).length > 0) {
        console.log('WARNING: Found images in content but no files uploaded!');
        console.log('Content images:', JSON.stringify(content.images, null, 2));
        
        // Check if any images have local URIs
        let hasLocalUris = false;
        Object.keys(content.images).forEach(area => {
          Object.keys(content.images[area]).forEach(field => {
            const images = content.images[area][field];
            if (Array.isArray(images)) {
              images.forEach(image => {
                if (image.uri && image.uri.startsWith('file://')) {
                  hasLocalUris = true;
                  console.error('FOUND LOCAL URI IN CONTENT:', image.uri);
                }
              });
            }
          });
        });
        
        if (hasLocalUris) {
          console.error('CRITICAL ERROR: Local URIs found in content - this should not happen!');
          console.error('The frontend is sending local URIs instead of uploading files!');
          return res.status(400).json({
            success: false,
            message: 'CRITICAL ERROR: Local file URIs found in content. This indicates a serious data integrity issue. Only server URLs are allowed.'
          });
        }
      }
      
      // If no files were uploaded, clear the images to avoid local URIs
      content.images = {};
    }

    // Coerce other primitive fields from body
    const title = req.body.title;
    const report_type = req.body.report_type;
    const property_id = req.body.property_id;
    const agent_id = req.body.agent_id;
    const client_id = req.body.client_id;
    const property_name = req.body.property_name;
    const client_name = req.body.client_name;
    const agent_name = req.body.agent_name;
    
    // Check if we have either IDs or stored names
    const hasIds = property_id && client_id; // agent_id not required since we use current user
    const hasNames = property_name && client_name; // agent_name not required since we use current user
    
    // If we have names, we can proceed even without IDs (preferred approach)
    const canProceed = hasNames || hasIds;
    
    if (!title || !report_type || !canProceed) {
      console.log('Missing fields:', { title, report_type, property_id, agent_id, client_id, property_name, client_name, agent_name }); // Debug log
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, report_type, and either (property_id, client_id) or (property_name, client_name)'
      });
    }
    
    // Use the current logged-in user as the agent (no database search needed)
    const currentUser = req.user; // This is set by the authentication middleware
    if (!currentUser) {
      return res.status(400).json({
        success: false,
        message: 'Current user not found'
      });
    }
    
    // Create agent object from current user
    const agent = {
      _id: currentUser._id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      phone: currentUser.phone || '',
      experience: currentUser.experience || 0,
      commissionRate: currentUser.commissionRate || 0,
      rating: currentUser.rating || 0,
      completed_inspections: currentUser.completed_inspections || 0,
      workload: currentUser.workload || 0,
      databaseName: currentUser.databaseName || 'propinspection_users',
      createdAt: currentUser.createdAt,
      updatedAt: currentUser.updatedAt
    };
    
    console.log('Using current user as agent:', agent);
    
    let property = null;
    let client = null;
    
    // If we have stored names, use them directly (skip database search)
    // This is the preferred approach to avoid database lookup issues
    if (hasNames) {
      console.log('Using stored names directly, skipping database search');
      property = {
        _id: property_id || new mongoose.Types.ObjectId(),
        address: { street: property_name },
        name: property_name
      };
      client = {
        _id: client_id || new mongoose.Types.ObjectId(),
        firstName: client_name.split(' ')[0] || '',
        lastName: client_name.split(' ').slice(1).join(' ') || '',
        email: content?.client?.email || req.body.client_email || '',
        phone: content?.client?.phone || req.body.client_phone || '',
        address: content?.client?.address || req.body.client_address || ''
      };
    } else if (hasIds) {
      // Original logic: search databases for property and client
      console.log('Searching for property and client in databases...');
      
      // Get dynamic list of databases
      const allDatabases = await getDynamicDatabases();
      
      console.log('Searching for property and client in databases in parallel:', allDatabases);
      
      // Helper function to search for property in a database
      async function searchPropertyInDatabase(databaseName) {
        try {
          const dbConnection = await getDatabaseConnection(databaseName);
          const collection = dbConnection.db.collection('properties');
          console.log(`Searching for property ${property_id} in ${databaseName}/properties`);
          const foundProperty = await collection.findOne({ _id: new mongoose.Types.ObjectId(property_id) });
          if (foundProperty) {
            console.log(`Found property in database: ${databaseName}`);
            return { database: databaseName, property: foundProperty };
          }
          return null;
        } catch (err) {
          console.log(`Error searching properties in ${databaseName}:`, err.message);
          return null;
        }
      }
      
      // Helper function to search for client in a database
      async function searchClientInDatabase(databaseName) {
        try {
          const dbConnection = await getDatabaseConnection(databaseName);
          const collection = dbConnection.db.collection('clients');
          console.log(`Searching for client ${client_id} in ${databaseName}/clients`);
          const foundClient = await collection.findOne({ _id: new mongoose.Types.ObjectId(client_id) });
          if (foundClient) {
            console.log(`Found client in database: ${databaseName}`);
            return { database: databaseName, client: foundClient };
          }
          return null;
        } catch (err) {
          console.log(`Error searching clients in ${databaseName}:`, err.message);
          return null;
        }
      }
      
      // Search for property and client in parallel
      const [propertyResults, clientResults] = await Promise.allSettled([
        Promise.allSettled(allDatabases.map(searchPropertyInDatabase)),
        Promise.allSettled(allDatabases.map(searchClientInDatabase))
      ]);
      
      // Extract results
      if (propertyResults.status === 'fulfilled') {
        for (const result of propertyResults.value) {
          if (result.status === 'fulfilled' && result.value) {
            property = result.value.property;
            console.log(`Property found in database: ${result.value.database}`);
            break;
          }
        }
      }
      
      if (clientResults.status === 'fulfilled') {
        for (const result of clientResults.value) {
          if (result.status === 'fulfilled' && result.value) {
            client = result.value.client;
            console.log(`Client found in database: ${result.value.database}`);
            break;
          }
        }
      }
      
      // Validate that property and client were found (agent is already set from current user)
      if (!property) {
        console.log('Property not found in any database. Searched databases:', allDatabases);
        console.log('Property ID searched:', property_id);
        return res.status(400).json({
          success: false,
          message: 'Property not found in any database'
        });
      }
      
      if (!client) {
        console.log('Client not found in any database. Searched databases:', allDatabases);
        console.log('Client ID searched:', client_id);
        return res.status(400).json({
          success: false,
          message: 'Client not found in any database'
        });
      }
    }
    
    console.log('All entities found, creating report...');
    
    // Final validation: Ensure no local URIs exist in the final content
    const validateNoLocalUris = (obj, path = '') => {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            if (typeof item === 'object' && item !== null && item.uri && item.uri.startsWith('file://')) {
              throw new Error(`CRITICAL ERROR: Local URI found at ${path}[${index}]: ${item.uri}`);
            }
            validateNoLocalUris(item, `${path}[${index}]`);
          });
        } else {
          Object.keys(obj).forEach(key => {
            validateNoLocalUris(obj[key], path ? `${path}.${key}` : key);
          });
        }
      }
    };

    try {
      validateNoLocalUris(content);
    } catch (error) {
      console.error('CRITICAL ERROR: Local URI validation failed:', error.message);
      return res.status(400).json({
        success: false,
        message: `CRITICAL ERROR: ${error.message}. Only server URLs are allowed in the database.`
      });
    }
    
    // Debug email information
    console.log('Email debugging:', {
      'currentUser.email': currentUser.email,
      'agent.email': agent.email,
      'client.email': client?.email,
      'content?.client?.email': content?.client?.email,
      'req.body.client_email': req.body.client_email
    });

    const report = new models.Report({
      ...req.body,
      content,
      generated_at: new Date(),
      generated_by: currentUser.databaseName || currentUser.email, // Use actual database name or email
      // Store names directly instead of IDs for easier display
      property_name: property_name || property.address?.street || property.name || 'Property Address',
      client_name: client_name || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client Name',
      agent_name: agent_name || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Agent Name',
      // Store emails for easy access
      agent_email: agent.email || currentUser.email,
      client_email: client?.email || content?.client?.email || req.body.client_email || ''
    });
    
    console.log('Saving report to database...');
    console.log('Report data being saved:', {
      agent_email: report.agent_email,
      client_email: report.client_email,
      agent_name: report.agent_name,
      client_name: report.client_name
    });
    await report.save();
    console.log('Report saved successfully with ID:', report._id);
    console.log('Saved report email fields:', {
      agent_email: report.agent_email,
      client_email: report.client_email
    });
    
    // Invalidate all caches
    invalidateAllCaches();
    
    // Populate the response with the found entities
    const populatedReport = {
      ...report.toObject(),
      property_id: property,
      agent_id: agent,
      client_id: client
    };
    
    console.log('=== REPORT CREATION COMPLETED ===');
    res.status(201).json({
      success: true,
      data: populatedReport,
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// PUT /api/reports/:id - Update report
router.put('/:id', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    const report = await models.Report.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    ).populate([
      { path: 'property_id', select: 'address' },
      { path: 'agent_id', select: 'firstName lastName email' },
      { path: 'client_id', select: 'firstName lastName email' }
    ]);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.json({
      success: true,
      data: report,
      message: 'Report updated successfully'
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report'
    });
  }
});

// DELETE /api/reports/:id - Delete report
router.delete('/:id', async (req, res) => {
  try {
    console.log('=== REPORT DELETION STARTED ===');
    console.log('Deleting report with ID:', req.params.id);
    console.log('Current user:', req.user);
    
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    let deletedReport = null;
    let sourceDatabase = null;
    
    // If user is admin, search across ALL databases
    if (currentUser.role === 'admin') {
      console.log('Admin user - searching across all databases');
      
      const databasesToCheck = await getDynamicDatabases();
      console.log(`Searching ${databasesToCheck.length} databases for report ${req.params.id}`);
      
      // Search for the report in each database
      for (const databaseName of databasesToCheck) {
        try {
          console.log(`Searching for report in database: ${databaseName}`);
          const dbConnection = await getDatabaseConnection(databaseName);
          
          // Register models on this connection if not already registered
          if (!dbConnection.models || !dbConnection.models.Report) {
            console.log(`Registering models for database: ${databaseName}`);
            const ReportModel = dbConnection.model('Report', require('../models/Report').schema);
            dbConnection.models = dbConnection.models || {};
            dbConnection.models.Report = ReportModel;
          }
          
          if (dbConnection && dbConnection.models && dbConnection.models.Report) {
            const report = await dbConnection.models.Report.findById(req.params.id);
            
            if (report) {
              console.log(`Found report in database: ${databaseName}`);
              deletedReport = await dbConnection.models.Report.findByIdAndDelete(req.params.id);
              sourceDatabase = databaseName;
              break; // Found and deleted, exit loop
            }
          }
        } catch (dbError) {
          console.error(`Error searching in database ${databaseName}:`, dbError.message);
          // Continue with other databases
        }
      }
      
    } else {
      // For non-admin users, search only in their own database
      console.log('Non-admin user - searching in own database only');
      const models = getUserModels(req.userDatabase);
      deletedReport = await models.Report.findByIdAndDelete(req.params.id);
      sourceDatabase = req.userDatabase;
    }
    
    if (!deletedReport) {
      console.log('Report not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    console.log('Report deleted successfully:', deletedReport.title);
    console.log('Deleted from database:', sourceDatabase);
    console.log('=== REPORT DELETION COMPLETED ===');
    
    // Invalidate all caches
    invalidateAllCaches();
    
    res.json({
      success: true,
      message: 'Report deleted successfully',
      data: { 
        deletedReportId: req.params.id,
        deletedFromDatabase: sourceDatabase,
        reportTitle: deletedReport.title
      }
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report'
    });
  }
});

// GET /api/reports/analytics - Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const models = getUserModels(req.userDatabase);
    
    // Filter reports by the current user/agent
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const userFilter = {
      $or: [
        { 'agent_id._id': currentUser._id },
        { 'agent_id': currentUser._id },
        { 'agent_name': `${currentUser.firstName} ${currentUser.lastName}` },
        { 'agent_name': currentUser.email },
        { 'agent_name': currentUser.databaseName },
        { 'agent_name': currentUser.username }, // Add username matching
        { 'generated_by': currentUser.databaseName },
        { 'generated_by': currentUser.email },
        { 'generated_by': currentUser.username }, // Add username matching for generated_by
        // Include system-generated reports for this user's database
        { 'generated_by': 'system', 'agent_name': currentUser.username },
        { 'generated_by': 'system', 'agent_name': currentUser.databaseName },
        { 'generated_by': 'system', 'agent_name': currentUser.email }
      ]
    };
    
    const totalReports = await models.Report.countDocuments(userFilter);
    const completedReports = await models.Report.countDocuments({ ...userFilter, status: 'Completed' });
    const draftReports = await models.Report.countDocuments({ ...userFilter, status: 'Draft' });
    
    // Get reports by type
    const reportsByType = await models.Report.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: '$report_type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get recent reports
    const recentReports = await models.Report.find(userFilter)
      .sort({ generated_at: -1 })
      .limit(5)
      .populate('property_id', 'address')
      .populate('client_id', 'firstName lastName');
    
    res.json({
      success: true,
      data: {
        totalReports,
        completedReports,
        draftReports,
        reportsByType,
        recentReports
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Send email route
router.post('/send-email', async (req, res) => {
  try {
    const { reportId, agentEmail, clientEmail } = req.body;
    
    if (!reportId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Report ID is required' 
      });
    }

    // Get the report data
    const { Report } = getUserModels(req.userDatabase);
    let report;
    
    // Try to find report by ID, handling different ID formats
    try {
      // First try as ObjectId
      report = await Report.findById(reportId);
    } catch (error) {
      // If ObjectId fails, try to find by custom ID field
      report = await Report.findOne({ id: reportId });
    }
    
    // If report not found, create basic report data for email
    if (!report) {
      console.log('Report not found in database, using basic data for email');
      
      // Try to get agent email from current user if not provided in request
      const currentUser = req.user;
      const actualAgentEmail = agentEmail || (currentUser?.email);
      
      console.log('Report not found - email addresses being used:', {
        agentEmailFromRequest: agentEmail,
        agentEmailFromCurrentUser: currentUser?.email,
        actualAgentEmail: actualAgentEmail,
        clientEmail: clientEmail
      });
      
      const basicReportData = {
        id: reportId,
        propertyAddress: 'Property Address',
        inspectionDate: new Date(),
        inspectorName: 'Inspector',
        clientEmail: clientEmail,
        inspectionData: null, // No inspection data available for basic reports
        signatures: null, // No signatures available for basic reports
        content: null
      };

      const results = {
        agent: null,
        client: null
      };

      // Send email to agent if email is provided (use current user's email if available)
      if (actualAgentEmail && actualAgentEmail !== 'No email available') {
        try {
          const agentResult = await emailService.sendReportToAgent(actualAgentEmail, basicReportData, {
            replyTo: actualAgentEmail
          });
          results.agent = agentResult;
        } catch (error) {
          console.error('Error sending email to agent:', error);
          results.agent = { success: false, error: error.message };
        }
      }

      // Send email to client if email is provided (use agent email as reply-to)
      if (clientEmail && clientEmail !== 'No email available') {
        try {
          const clientResult = await emailService.sendReportToClient(clientEmail, basicReportData, {
            replyTo: actualAgentEmail // Use the agent email dynamically
          });
          results.client = clientResult;
        } catch (error) {
          console.error('Error sending email to client:', error);
          results.client = { success: false, error: error.message };
        }
      }

      // Check if at least one email was sent successfully
      const agentSuccess = results.agent && results.agent.success;
      const clientSuccess = results.client && results.client.success;
      const anySuccess = agentSuccess || clientSuccess;

      if (anySuccess) {
        return res.json({ 
          success: true, 
          message: 'Email(s) sent successfully (using basic report data)',
          results: results
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to send emails',
          results: results
        });
      }
    }

    // Use agent and client emails from report if available, otherwise fall back to request body
    const actualAgentEmail = report.agent_email || agentEmail;
    const actualClientEmail = report.client_email || clientEmail;

    console.log('Email addresses being used:', {
      agentEmailFromReport: report.agent_email,
      agentEmailFromRequest: agentEmail,
      actualAgentEmail: actualAgentEmail,
      clientEmailFromReport: report.client_email,
      clientEmailFromRequest: clientEmail,
      actualClientEmail: actualClientEmail
    });

    const reportData = {
      id: report._id || reportId,
      propertyAddress: report.propertyAddress || report.address || report.property?.address || 'Property Address',
      inspectionDate: report.inspectionDate || report.createdAt || new Date(),
      inspectorName: report.inspectorName || report.inspector || report.inspectorName || 'Inspector',
      clientEmail: actualClientEmail,
      inspectionData: report.content?.inspectionData || report.content?.inspectionAreas || report.content,
      signatures: report.content?.signatures || report.content?.inspectionData?.signatures || report.signatures,
      content: report.content
    };

    const results = {
      agent: null,
      client: null
    };

    // Send email to agent if email is provided (use agent email from report dynamically)
    if (actualAgentEmail && actualAgentEmail !== 'No email available') {
      try {
        const agentResult = await emailService.sendReportToAgent(actualAgentEmail, reportData, {
          replyTo: actualAgentEmail,
          databaseName: req.user?.databaseName || req.userDatabase
        });
        results.agent = agentResult;
      } catch (error) {
        console.error('Error sending email to agent:', error);
        results.agent = { success: false, error: error.message };
      }
    }

    // Send email to client if email is provided (use agent email from report as reply-to)
    if (actualClientEmail && actualClientEmail !== 'No email available') {
      try {
        const clientResult = await emailService.sendReportToClient(actualClientEmail, reportData, {
          replyTo: actualAgentEmail, // Use the agent email from report for reply-to
          databaseName: req.user?.databaseName || req.userDatabase
        });
        results.client = clientResult;
      } catch (error) {
        console.error('Error sending email to client:', error);
        results.client = { success: false, error: error.message };
      }
    }

    // Check if at least one email was sent successfully
    const agentSuccess = results.agent && results.agent.success;
    const clientSuccess = results.client && results.client.success;
    const anySuccess = agentSuccess || clientSuccess;

    if (anySuccess) {
      res.json({ 
        success: true, 
        message: 'Email(s) sent successfully',
        results: results
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send emails',
        results: results
      });
    }
  } catch (error) {
    console.error('Error in send-email route:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// Send all reports in a single email with multiple PDF attachments
router.post('/send-email-bulk', async (req, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const recipientEmail = (req.body && req.body.recipientEmail) || currentUser.email;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    const models = getUserModels(req.userDatabase);

    // Build user filter as in analytics route
    const userFilter = {
      $or: [
        { 'agent_id._id': currentUser._id },
        { 'agent_id': currentUser._id },
        { 'agent_name': `${currentUser.firstName} ${currentUser.lastName}` },
        { 'agent_name': currentUser.email },
        { 'agent_name': currentUser.databaseName },
        { 'agent_name': currentUser.username },
        { 'generated_by': currentUser.databaseName },
        { 'generated_by': currentUser.email },
        { 'generated_by': currentUser.username },
        { 'generated_by': 'system', 'agent_name': currentUser.username },
        { 'generated_by': 'system', 'agent_name': currentUser.databaseName },
        { 'generated_by': 'system', 'agent_name': currentUser.email }
      ]
    };

    // Fetch all reports for the user
    const reports = await models.Report.find(userFilter)
      .sort({ generated_at: -1 })
      .lean();

    if (!reports || reports.length === 0) {
      return res.status(404).json({ success: false, error: 'No reports found to send' });
    }

    // Map to the compact reportData structure used by email service
    const reportsData = reports.map((report) => ({
      id: report._id,
      propertyAddress: report.propertyAddress || report.address || report.property?.address || report.property_name || 'Property Address',
      inspectionDate: report.inspectionDate || report.createdAt || report.generated_at || new Date(),
      inspectorName: report.inspectorName || report.inspector || report.agent_name || 'Inspector',
      clientEmail: report.client_email || '',
      inspectionData: report.content?.inspectionData || report.content?.inspectionAreas || report.content,
      signatures: report.content?.signatures || report.signatures,
      content: report.content
    }));

    const result = await emailService.sendReportsBundle(recipientEmail, reportsData, null, req.user?.databaseName || req.userDatabase);
    if (result.success) {
      return res.json({ success: true, message: `Sent ${reportsData.length} report PDF(s) to ${recipientEmail}` });
    }
    return res.status(500).json({ success: false, error: result.error || 'Failed to send emails' });
  } catch (error) {
    console.error('Error in send-email-bulk route:', error);
    res.status(500).json({ success: false, error: 'Failed to send bulk email' });
  }
});

module.exports = router;
