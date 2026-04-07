// Export WatermelonDB database
export { default as database } from './watermelon';

// Also export the legacy SQLite service for backward compatibility
export { databaseService as legacyDatabase } from './sqlite';