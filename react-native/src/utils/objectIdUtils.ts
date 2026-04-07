// Utility functions for generating MongoDB-compatible ObjectIds
// This ensures consistent ID format between local and server

/**
 * Generate a MongoDB-compatible ObjectId
 * This creates a 24-character hex string that follows MongoDB ObjectId format
 */
export function generateObjectId(): string {
  // Generate a timestamp (4 bytes)
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  
  // Generate random bytes (5 bytes)
  const randomBytes = Array.from({ length: 10 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  // Generate a counter (3 bytes) - using timestamp for uniqueness
  const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  
  return timestamp + randomBytes + counter;
}

/**
 * Check if a string is a valid MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Convert a local ID to MongoDB ObjectId format if needed
 */
export function ensureObjectId(id: string): string {
  if (isValidObjectId(id)) {
    return id;
  }
  
  // If it's a local ID with prefix, generate a new ObjectId
  if (id.startsWith('report_') || id.startsWith('prop_') || id.startsWith('client_') || id.startsWith('agent_')) {
    return generateObjectId();
  }
  
  // For any other format, generate a new ObjectId
  return generateObjectId();
}

/**
 * Create a temporary local ID that can be converted to ObjectId later
 */
export function createTempId(prefix: string = 'temp'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
