const express = require('express');
const mongoose = require('mongoose');
const { connectMain, closeAll } = require('./db');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware – allow CORS from any origin
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
// Respect X-Forwarded-* headers when behind proxies (for correct absolute URLs)
app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving removed - images are now stored in MongoDB GridFS
// Images are served via /api/images/:imageId endpoint

// Connect to database once using centralized manager
(async () => {
  try {
    const conn = await connectMain();
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
})();

// Routes
app.use('/api', require('./routes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Database connection status endpoint
app.get('/api/health/db', (req, res) => {
  try {
    const { getConnectionStats } = require('./db');
    const stats = getConnectionStats();
    res.status(200).json({
      status: 'OK',
      message: 'Database connections status',
      connections: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to get database status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server with port fallback if in use
let server;

const startServer = (port, attempt = 0) => {
  try {
    server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        const nextPort = Number(port) + 1;
        if (attempt < 5) {
          console.warn(`Port ${port} is in use. Trying port ${nextPort}...`);
          setTimeout(() => startServer(nextPort, attempt + 1), 100);
        } else {
          console.error(`Failed to bind after ${attempt + 1} attempts.`);
          process.exit(1);
        }
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (e) {
    console.error('Unexpected error while starting server:', e);
    process.exit(1);
  }
};

startServer(PORT);

// Graceful shutdown
const shutdown = async (signal) => {
  try {
    console.log(`Received ${signal}. Closing server and DB connections...`);
    server.close(async () => {
      await closeAll();
      process.exit(0);
    });
  } catch (e) {
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
