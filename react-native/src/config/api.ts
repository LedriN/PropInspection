// API Configuration for React Native app
// Uses VITE_API_URL environment variable for dynamic server configuration

// Get API URL from environment variable (VITE_API_URL)
import AsyncStorage from '@react-native-async-storage/async-storage';
const VITE_API_URL = process.env.VITE_API_URL || process.env.EXPO_PUBLIC_API_URL;

// Fallback URLs if environment variable is not set
const DEFAULT_DEV_URL = 'http://192.168.1.3:5000'; 
const DEFAULT_PROD_URL = 'https://propinspection-dashboard-main.onrender.com';

// Determine the base URL
const getBaseUrl = () => {
  if (VITE_API_URL) {
    // Remove /api suffix if present to get base URL
    return VITE_API_URL.replace(/\/api$/, '');
  }
  
  // Fallback to default URLs based on environment
  return __DEV__ ? DEFAULT_DEV_URL : DEFAULT_PROD_URL;
};

const BASE_URL = getBaseUrl();
const API_BASE_URL = `${BASE_URL}/api`;

// Debug logging
console.log('=== API CONFIGURATION ===');
console.log('VITE_API_URL:', VITE_API_URL);
console.log('BASE_URL:', BASE_URL);
console.log('API_BASE_URL:', API_BASE_URL);
console.log('Environment:', __DEV__ ? 'development' : 'production');

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    CHANGE_PASSWORD: '/auth/change-password',
    VERIFY_PASSWORD: '/auth/verify-password'
  },
  AGENTS: {
    LIST: '/agents',
    CREATE: '/agents',
    UPDATE: (id: string) => `/agents/${id}`,
    DELETE: (id: string) => `/agents/${id}`,
    GET: (id: string) => `/agents/${id}`
  },
  PROPERTIES: {
    LIST: '/properties',
    CREATE: '/properties',
    UPDATE: (id: string) => `/properties/${id}`,
    DELETE: (id: string) => `/properties/${id}`,
    GET: (id: string) => `/properties/${id}`
  },
  CLIENTS: {
    LIST: '/clients',
    CREATE: '/clients',
    UPDATE: (id: string) => `/clients/${id}`,
    DELETE: (id: string) => `/clients/${id}`,
    GET: (id: string) => `/clients/${id}`
  },
  INSPECTIONS: {
    LIST: '/inspections',
    CREATE: '/inspections',
    UPDATE: (id: string) => `/inspections/${id}`,
    DELETE: (id: string) => `/inspections/${id}`,
    GET: (id: string) => `/inspections/${id}`
  },
  REPORTS: {
    LIST: '/reports',
    CREATE: '/reports',
    UPDATE: (id: string) => `/reports/${id}`,
    DELETE: (id: string) => `/reports/${id}`,
    GET: (id: string) => `/reports/${id}`,
    SEND_EMAIL: '/reports/send-email'
  },
  AGENT_DATA: {
    LIST: '/agent-data',
    CREATE: '/agent-data',
    UPDATE: (id: string) => `/agent-data/${id}`,
    DELETE: (id: string) => `/agent-data/${id}`,
    GET: (id: string) => `/agent-data/${id}`
  },
  STATS: {
    USER: '/stats/user'
  }
};

// Custom error class to carry HTTP status code
export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Type for authentication error handler callback
export type AuthErrorHandler = () => Promise<void> | void;

export class ApiClient {
  private static instance: ApiClient;
  private baseURL: string;
  private token: string | null = null;
  private authErrorHandler: AuthErrorHandler | null = null;
  private isHandlingAuthError: boolean = false; // Prevent recursive auth error handling

  private constructor() {
    this.baseURL = API_BASE_URL;
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  /**
   * Register a handler for authentication errors (401)
   * This will be called automatically when a 401 error is detected
   */
  public setAuthErrorHandler(handler: AuthErrorHandler | null) {
    this.authErrorHandler = handler;
  }

  /**
   * Clear authentication token from memory and storage
   */
  private async clearAuthToken(): Promise<void> {
    this.token = null;
    try {
      await AsyncStorage.removeItem('auth_token');
      console.log('Authentication token cleared from storage');
    } catch (error) {
      console.error('Failed to clear token from storage:', error);
    }
  }

  // Lazily load token from storage if missing (handles app restarts/background tasks)
  private async ensureTokenLoaded(): Promise<void> {
    if (this.token) return;
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        this.token = storedToken;
      }
    } catch (e) {
      // Ignore storage errors; request will proceed without token and server will reject
      console.warn('Failed to load token from storage:', (e as Error).message);
    }
  }

  // Helper method to convert relative image URLs to absolute URLs
  public getImageUrl(relativeUrl: string): string {
    if (relativeUrl.startsWith('http')) {
      return relativeUrl; // Already absolute
    }
    return `${BASE_URL}${relativeUrl}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    await this.ensureTokenLoaded();
    
    const headers: Record<string, string> = {};

    // Only set Content-Type when a request body exists and it's not FormData
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Add any existing headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      console.log(`Making API request to: ${url}`);
      console.log('Request config:', {
        method: config.method,
        headers: config.headers,
        bodyType: config.body instanceof FormData ? 'FormData' : typeof config.body,
        bodySize: config.body instanceof FormData ? 'FormData (size unknown)' : (typeof config.body === 'string' ? config.body.length : 'unknown')
      });
      
      // Debug FormData contents if it's FormData
      if (config.body instanceof FormData) {
        console.log('FormData detected - attempting to debug contents...');
        console.log('FormData constructor:', config.body.constructor.name);
        // Note: FormData.entries() might not be available in React Native
        try {
          // This might not work in React Native, but let's try
          console.log('FormData entries not accessible in React Native');
        } catch (e) {
          console.log('FormData debugging not available:', (e as Error).message);
        }
      }
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API request failed with status ${response.status}:`, errorData);
        
        // Handle 401 Unauthorized errors
        if (response.status === 401 && !this.isHandlingAuthError) {
          this.isHandlingAuthError = true;
          console.warn('Received 401 Unauthorized - clearing authentication and logging out');
          
          // Clear token from memory and storage
          await this.clearAuthToken();
          
          // Call registered auth error handler (if any)
          // This will typically logout the user and redirect to login
          if (this.authErrorHandler) {
            try {
              await this.authErrorHandler();
            } catch (handlerError) {
              console.error('Auth error handler failed:', handlerError);
            }
          }
          
          this.isHandlingAuthError = false;
          
          // Throw a specific error that can be caught by callers
          throw new ApiError(
            errorData.message || 'Your session has expired. Please log in again.',
            401,
            errorData
          );
        }
        
        // For non-401 errors, throw ApiError with status code
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      console.log(`API request successful:`, data);
      return data;
    } catch (error) {
      // If it's already an ApiError (including 401), re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      
      console.error('API request failed:', error);
      console.error('Request URL:', url);
      console.error('Request config:', config);
      
      // Handle specific error types
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new ApiError('Network request failed. Please check your internet connection and try again.');
      } else if (error instanceof Error && error.message.includes('ENOENT')) {
        // Handle Metro bundler issues
        console.warn('Metro bundler issue detected, attempting to continue...');
        throw new ApiError('Application error. Please restart the app and try again.');
      }
      
      // Wrap unknown errors in ApiError
      throw new ApiError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        undefined,
        error
      );
    }
  }

  public async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const requestOptions: RequestInit = {
      method: 'POST',
      ...options
    };

    if (data) {
      if (data instanceof FormData) {
        // For FormData, don't set Content-Type header - let the browser set it with boundary
        requestOptions.body = data;
      } else {
        // For JSON data
        requestOptions.body = JSON.stringify(data);
      }
    }

    return this.request<T>(endpoint, requestOptions);
  }

  public async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const requestOptions: RequestInit = {
      method: 'PATCH',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
      ...options,
    };
    return this.request<T>(endpoint, requestOptions);
  }

  public async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }


  /**
   * Test API connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      return response.ok;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  /**
   * Test production server connection specifically
   */
  public async testProductionConnection(): Promise<{ success: boolean; message: string; serverInfo?: any }> {
    try {
      const healthUrl = `${this.baseURL.replace('/api', '')}/health`;
      const apiInfoUrl = `${this.baseURL}`;
      
      console.log(`Testing production connection to: ${healthUrl}`);
      
      // Test health endpoint
      const healthResponse = await fetch(healthUrl);
      if (!healthResponse.ok) {
        return {
          success: false,
          message: `Health check failed with status: ${healthResponse.status}`
        };
      }

      // Test API info endpoint
      const apiResponse = await fetch(apiInfoUrl);
      if (!apiResponse.ok) {
        return {
          success: false,
          message: `API info check failed with status: ${apiResponse.status}`
        };
      }

      const serverInfo = await apiResponse.json();
      
      return {
        success: true,
        message: 'Production server connection successful',
        serverInfo
      };
    } catch (error) {
      console.error('Production connection test failed:', error);
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export default ApiClient;
