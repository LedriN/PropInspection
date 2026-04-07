#!/usr/bin/env node

/**
 * Setup script to configure MongoDB connection limits
 * Run this script to set up proper environment variables for connection pooling
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

console.log('🔧 Setting up MongoDB connection limits...\n');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log('📄 Creating .env file from env.example...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
  } else {
    console.log('❌ env.example file not found. Please create a .env file manually.');
    process.exit(1);
  }
}

// Read current .env content
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if connection pool settings already exist
const hasConnectionSettings = envContent.includes('MONGO_MAX_POOL') || 
                            envContent.includes('MONGO_TENANT_MAX_POOL');

if (!hasConnectionSettings) {
  console.log('⚙️  Adding MongoDB connection pool settings...');
  
  const connectionSettings = `
# MongoDB Connection Pool Settings (to prevent exceeding 500 connection limit)
# Main database connection pool
MONGO_MAX_POOL=5
MONGO_MIN_POOL=1

# Tenant database connection pool (per user database)
MONGO_TENANT_MAX_POOL=3
MONGO_TENANT_MIN_POOL=0
`;

  envContent += connectionSettings;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Connection pool settings added to .env file!');
} else {
  console.log('ℹ️  Connection pool settings already exist in .env file.');
}

console.log('\n📊 Connection Pool Configuration:');
console.log('   Main Database:');
console.log('   - Max Pool Size: 5 connections');
console.log('   - Min Pool Size: 1 connection');
console.log('   Tenant Databases:');
console.log('   - Max Pool Size: 3 connections per database');
console.log('   - Min Pool Size: 0 connections');
console.log('\n💡 This configuration will help prevent exceeding MongoDB\'s 500 connection limit.');
console.log('   Each tenant database will use a maximum of 3 connections, and the main');
console.log('   database will use a maximum of 5 connections.');

console.log('\n🚀 To apply these settings:');
console.log('   1. Restart your server');
console.log('   2. Monitor connections at: http://localhost:5000/api/health/db');
console.log('   3. Check server logs for connection pool information');

console.log('\n✅ Setup complete!');
