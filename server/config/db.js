import mongoose from 'mongoose';

/**
 * Enterprise Production-Grade MongoDB Connection Handler
 * 
 * Connects to MongoDB using Mongoose v8+ standards, enforces pre-connection URI validation,
 * configures retry timeouts and index creation based on environment, and outputs clean logs.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // 1. Pre-connection URI Validation
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    console.error('====================================');
    console.error('\nMongoDB Connection Failed');
    console.error('\nReason: MONGODB_URI is undefined or not a valid string.');
    console.error('Possible Causes:');
    console.error('  1. .env file is missing or not loaded prior to db connection.');
    console.error('  2. MONGODB_URI variable is empty in environment.');
    console.error('Recommended Fixes:');
    console.error('  - Verify server/.env contains MONGODB_URI=mongodb://127.0.0.1:27017/dds');
    console.error('====================================\n');
    process.exit(1);
  }

  const sanitizedUri = uri.trim();
  if (!sanitizedUri.startsWith('mongodb://') && !sanitizedUri.startsWith('mongodb+srv://')) {
    console.error('====================================');
    console.error('\nMongoDB Connection Failed');
    console.error(`\nReason: MONGODB_URI scheme is invalid (must start with "mongodb://" or "mongodb+srv://").`);
    console.error('Possible Causes:');
    console.error('  1. Malformed connection string in .env file.');
    console.error('Recommended Fixes:');
    console.error('  - Format MONGODB_URI as mongodb://127.0.0.1:27017/dbname or mongodb+srv://user:pass@cluster.mongodb.net/dbname');
    console.error('====================================\n');
    process.exit(1);
  }

  // 2. Mongoose 8 Options
  const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    autoIndex: process.env.NODE_ENV !== 'production'
  };

  try {
    console.log('====================================');
    console.log(' MongoDB Connection');
    console.log('====================================\n');
    console.log('\u2713 Environment Loaded\n');
    console.log('\u2713 MongoDB URI Found\n');
    console.log('Connecting...\n');

    const conn = await mongoose.connect(sanitizedUri, mongooseOptions);

    const host = conn.connection.host || 'localhost';
    const dbName = conn.connection.name || 'default';
    const port = conn.connection.port || 'default';
    const readyStateMap = {
      0: 'Disconnected (0)',
      1: 'Connected (1)',
      2: 'Connecting (2)',
      3: 'Disconnecting (3)'
    };
    const readyState = readyStateMap[conn.connection.readyState] || `${conn.connection.readyState}`;

    console.log('\u2713 Connected Successfully\n');
    console.log(`Host: ${host}`);
    console.log(`Database: ${dbName}`);
    console.log(`Port: ${port}`);
    console.log(`Ready State: ${readyState}\n`);
    console.log('====================================\n');

    return conn;

  } catch (error) {
    console.error('====================================');
    console.error('\nMongoDB Connection Failed');
    console.error(`\nReason: ${error.message}`);
    console.error('Possible Causes:');
    console.error('  1. Local MongoDB service (mongod) is not running on host/port.');
    console.error('  2. Network firewall or Atlas IP whitelist restriction.');
    console.error('  3. Database credentials inside MONGODB_URI are incorrect.');
    console.error('Recommended Fixes:');
    console.error('  - Start MongoDB daemon locally (`net start MongoDB` or `mongod`).');
    console.error('  - Check cluster connectivity, username, and password if using MongoDB Atlas.');
    console.error('====================================\n');

    process.exit(1);
  }
};

export default connectDB;
