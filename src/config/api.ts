// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',

  
  TIMEOUT: 10000, // 10 seconds
}

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}

// Resolve backend origin for static assets (e.g., /uploads/...)
// Prefer explicit VITE_BACKEND_URL; fallback to origin derived from BASE_URL
const resolveBackendOrigin = (): string => {
  const explicit = import.meta.env.VITE_BACKEND_URL as string | undefined
  if (explicit) return explicit.replace(/\/$/, '')
  try {
    const origin = new URL(API_CONFIG.BASE_URL).origin
    return origin
  } catch (_e) {
    // Fallback to same origin if BASE_URL isn't absolute
    return ''
  }
}

const ASSET_BASE_URL = resolveBackendOrigin()

// Build absolute URL for assets saved with relative paths like /uploads/...
export const getAssetUrl = (maybeRelativePath: string | undefined | null): string => {
  if (!maybeRelativePath) return ''
  // Already absolute
  if (/^https?:\/\//i.test(maybeRelativePath)) return maybeRelativePath
  // Ensure leading slash
  const rel = maybeRelativePath.startsWith('/') ? maybeRelativePath : `/${maybeRelativePath}`
  // If ASSET_BASE_URL is empty (same origin), just return rel
  if (!ASSET_BASE_URL) return rel
  return `${ASSET_BASE_URL}${rel}`
}

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}
