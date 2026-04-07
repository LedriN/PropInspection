const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { getTenantDb } = require('../db');

/**
 * Save an image buffer to MongoDB GridFS
 * @param {Buffer} buffer - Image buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - MIME type (e.g., 'image/jpeg')
 * @param {string} databaseName - Database name (tenant database)
 * @returns {Promise<string>} - Image ID as string
 */
async function saveImageToGridFS(buffer, filename, mimetype, databaseName) {
  try {
    const db = await getTenantDb(databaseName);
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${filename}`;
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(uniqueFilename, {
      contentType: mimetype,
      metadata: {
        originalName: filename,
        uploadedAt: new Date(),
        databaseName: databaseName // Store database name for retrieval
      }
    });
    
    // Upload the buffer
    return new Promise((resolve, reject) => {
      uploadStream.end(buffer);
      uploadStream.on('finish', () => {
        resolve(uploadStream.id.toString());
      });
      uploadStream.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error saving image to GridFS:', error);
    throw error;
  }
}

/**
 * Get image buffer from MongoDB GridFS
 * @param {string} imageId - Image ID (GridFS file ID)
 * @param {string} databaseName - Database name (tenant database)
 * @param {boolean} silent - If true, suppress error logging (useful during searches)
 * @returns {Promise<{buffer: Buffer, contentType: string, databaseName?: string}>}
 */
async function getImageFromGridFS(imageId, databaseName, silent = false) {
  try {
    const db = await getTenantDb(databaseName);
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Convert string ID to ObjectId if needed
    const ObjectId = mongoose.Types.ObjectId;
    let fileId;
    try {
      fileId = new ObjectId(imageId);
    } catch (e) {
      throw new Error(`Invalid image ID format: ${imageId}`);
    }
    
    // Check if file exists
    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      throw new Error(`Image not found: ${imageId}`);
    }
    
    const file = files[0];
    const chunks = [];
    
    // Download the file
    return new Promise((resolve, reject) => {
      const downloadStream = bucket.openDownloadStream(fileId);
      
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      downloadStream.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: file.contentType || 'image/jpeg',
          databaseName: file.metadata?.databaseName || databaseName
        });
      });
      
      downloadStream.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    // Only log error if not in silent mode (silent mode is used during searches)
    if (!silent) {
      console.error('Error getting image from GridFS:', error);
    }
    throw error;
  }
}

/**
 * Find image in any database by searching metadata
 * @param {string} imageId - Image ID (GridFS file ID)
 * @returns {Promise<{buffer: Buffer, contentType: string, databaseName: string}>}
 */
async function findImageInAnyDatabase(imageId) {
  try {
    const User = require('../models/User').model;
    const users = await User.find({ databaseName: { $exists: true, $ne: null } })
      .select('databaseName')
      .limit(50); // Limit to avoid performance issues
    
    const databasesToCheck = [...new Set(users.map(u => u.databaseName).filter(Boolean))];
    
    for (const dbName of databasesToCheck) {
      try {
        // Use silent mode to suppress expected "not found" errors during search
        const result = await getImageFromGridFS(imageId, dbName, true);
        return { ...result, databaseName: dbName };
      } catch (e) {
        // Continue to next database - errors are expected during search
        continue;
      }
    }
    
    // Only log error if image wasn't found in any database
    const error = new Error(`Image not found in any database: ${imageId}`);
    console.error('Error finding image in any database:', error);
    throw error;
  } catch (error) {
    // Re-throw if it's already our custom error, otherwise wrap it
    if (error.message && error.message.includes('Image not found in any database')) {
      throw error;
    }
    console.error('Error finding image in any database:', error);
    throw error;
  }
}

/**
 * Delete an image from MongoDB GridFS
 * @param {string} imageId - Image ID (GridFS file ID)
 * @param {string} databaseName - Database name (tenant database)
 * @returns {Promise<void>}
 */
async function deleteImageFromGridFS(imageId, databaseName) {
  try {
    const db = await getTenantDb(databaseName);
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Convert string ID to ObjectId if needed
    const ObjectId = mongoose.Types.ObjectId;
    let fileId;
    try {
      fileId = new ObjectId(imageId);
    } catch (e) {
      throw new Error(`Invalid image ID format: ${imageId}`);
    }
    
    await bucket.delete(fileId);
  } catch (error) {
    console.error('Error deleting image from GridFS:', error);
    throw error;
  }
}

/**
 * Save base64 image data to MongoDB GridFS
 * @param {string} dataUri - Base64 data URI (e.g., 'data:image/png;base64,...')
 * @param {string} databaseName - Database name (tenant database)
 * @returns {Promise<string>} - Image ID as string
 */
async function saveBase64ImageToGridFS(dataUri, databaseName) {
  try {
    const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/.exec(dataUri);
    if (!match) {
      throw new Error('Invalid base64 image data URI');
    }
    
    const mimeType = match[1];
    const base64Data = match[3];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType === 'image/png' ? '.png' : 
                mimeType === 'image/webp' ? '.webp' : 
                mimeType === 'image/gif' ? '.gif' : '.jpg';
    const filename = `image${ext}`;
    
    return await saveImageToGridFS(buffer, filename, mimeType, databaseName);
  } catch (error) {
    console.error('Error saving base64 image to GridFS:', error);
    throw error;
  }
}

module.exports = {
  saveImageToGridFS,
  getImageFromGridFS,
  deleteImageFromGridFS,
  saveBase64ImageToGridFS,
  findImageInAnyDatabase
};

