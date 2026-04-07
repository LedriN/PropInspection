import { ApiClient, ApiError } from '../config/api';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../database';
import { offlineService } from './offlineService';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      username: string;
      databaseName: string;
      role: string;
      lastLogin?: string;
    };
    token: string;
  };
}

export interface AuthError {
  success: false;
  message: string;
  error?: string;
}

export class AuthService {
  private static instance: AuthService;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
    // Note: Auth error handler is registered by AuthProvider in useAuth hook
    // to allow React state updates
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticate user with backend API
   * ONLY ALLOWS USERS WITH ROLE 'agent' TO LOGIN
   * Works offline-first: stores user locally and syncs when online
   */
  public async login(email: string, password: string): Promise<User> {
    try {
      const syncStatus = offlineService.getSyncStatus();
      
      if (!syncStatus.isOnline) {
        // Try to authenticate with local data first
        const localUser = await this.authenticateOffline(email, password);
        if (localUser) {
          return localUser;
        }
        throw new Error('Cannot connect to server. Please check your internet connection and try again.');
      }

      console.log('Attempting login for:', email);
      const response = await this.apiClient.post<LoginResponse>('/auth/login', {
        email,
        password
      });

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      const { user, token } = response.data;

      // CRITICAL: Check if user is an agent
      if (user.role !== 'agent') {
        console.log('Login rejected - user is not an agent. Role:', user.role);
        throw new Error('Access denied. Only agents can sign in to this application.');
      }

      console.log('Login successful for agent:', user.email, 'Role:', user.role);

      // Store token and user data
      await this.storeAuthData(token, user);

      // Store user in local database for offline access
      await this.storeUserLocally(user);

      // Set token for future API calls
      this.apiClient.setToken(token);

      // Convert backend user format to app user format
      const appUser: User = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role as 'agent',
        company: user.company || 'Property Inspections', // Use company from backend or default
        databaseName: user.databaseName,
        username: user.username
      };

      // Update sync service with new token and trigger sync
      try {
        const { syncService } = await import('./syncService');
        await syncService.updateAuthToken(token);
        await syncService.syncAllData();
      } catch (error) {
        console.error('Failed to sync after login:', error);
        // Don't throw - login should still succeed even if sync fails
      }

      return appUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Get current user from stored data
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      const token = await AsyncStorage.getItem(TOKEN_KEY);

      if (!userData || !token) {
        return null;
      }

      // Verify token is still valid by calling /auth/me
      try {
        this.apiClient.setToken(token);
        const response = await this.apiClient.get<{ success: boolean; data: { user: any } }>('/auth/me');
        
        if (response.success) {
          const user = response.data.user;
          
          // Check if user is still an agent
          if (user.role !== 'agent') {
            console.log('User role changed - no longer an agent. Role:', user.role);
            await this.logout();
            return null;
          }

          // Convert to app user format
          const appUser: User = {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role as 'agent',
            company: user.company || 'Property Inspections',
            databaseName: user.databaseName,
            username: user.username
          };

          return appUser;
        } else {
          await this.logout();
          return null;
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        // Check if it's a 401 error - if so, logout was already handled by API client
        if (error instanceof ApiError && error.status === 401) {
          // Logout already handled by auth error handler
          return null;
        }
        await this.logout();
        return null;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Logout user and clear stored data
   */
  public async logout(): Promise<void> {
    // Clear stored data first (before API call to prevent 401 loops)
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    this.apiClient.setToken(null);

    // Clear token from sync service
    try {
      const { syncService } = await import('./syncService');
      await syncService.updateAuthToken(null);
    } catch (error) {
      console.error('Failed to clear sync service token:', error);
    }

    // Try to call logout endpoint (but don't fail if it errors)
    // Note: If we already got a 401, this will likely fail too, but that's okay
    try {
      await this.apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore errors during logout API call - we've already cleared local data
      console.log('Logout API call failed (expected if already logged out):', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Store authentication data locally
   */
  private async storeAuthData(token: string, user: any): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [USER_KEY, JSON.stringify(user)]
      ]);
    } catch (error) {
      console.error('Failed to store auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Check if user is currently authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Authenticate user offline using local database
   */
  private async authenticateOffline(email: string, password: string): Promise<User | null> {
    try {
      await database.init();
      
      // Check if user exists in local database
      const users = await database.findAll('users', 'email = ?', [email]);
      
      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      
      // For offline mode, we'll allow login if the user exists locally
      // In a real app, you might want to store a hashed password locally
      console.log('Offline authentication successful for:', email);
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as 'agent',
        company: user.company || 'Property Inspections'
      };
    } catch (error) {
      console.error('Offline authentication failed:', error);
      return null;
    }
  }

  /**
   * Store user data in local database for offline access
   */
  private async storeUserLocally(user: any): Promise<void> {
    try {
      await database.init();
      
      const userRecord = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        company: user.company || 'Property Inspections',
        created_at: Date.now(),
        updated_at: Date.now()
      };

      // Check if user already exists
      const existingUser = await database.findById('users', user.id);
      
      if (existingUser) {
        await database.update('users', user.id, userRecord);
      } else {
        await database.insert('users', userRecord);
      }
    } catch (error) {
      console.error('Failed to store user locally:', error);
    }
  }
}

export default AuthService;
