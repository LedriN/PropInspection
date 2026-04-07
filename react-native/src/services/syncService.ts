import { database } from '../database';
import { offlineApiService } from './offlineApiService';
import { offlineService } from './offlineService';
import { ApiClient } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SyncService {
  private static instance: SyncService;
  private apiClient: ApiClient;
  private isInitialized = false;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  public async initializeApp(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing app with offline-first approach...');
      
      // Initialize database
      await database.init();
      
      // Initialize offline service after database is ready
      await offlineService.initialize();
      
      // Set authentication token if available
      await this.setAuthToken();
      
      // Check if we have any data in local database
      const hasLocalData = await this.hasLocalData();
      
      if (!hasLocalData) {
        console.log('No local data found, performing initial sync...');
        await this.performInitialSync();
      } else {
        console.log('Local data found, checking for updates...');
        await this.checkForUpdates();
      }
      
      this.isInitialized = true;
      console.log('App initialization completed');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // Don't throw error - app should work offline even if sync fails
    }
  }

  private async hasLocalData(): Promise<boolean> {
    try {
      const tables = ['properties', 'clients', 'agents', 'inspections', 'reports'];
      
      for (const table of tables) {
        const count = await database.query(`SELECT COUNT(*) as count FROM ${table}`);
        if (count[0]?.count > 0) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check local data:', error);
      return false;
    }
  }

  private async performInitialSync(): Promise<void> {
    const syncStatus = offlineApiService.getOfflineStatus();
    
    if (!syncStatus.isOnline) {
      console.log('Device is offline, skipping initial sync');
      return;
    }

    try {
      console.log('Performing initial sync...');
      
      // Sync all tables
      await offlineApiService.syncAllTables();
      
      console.log('Initial sync completed successfully');
    } catch (error) {
      console.error('Initial sync failed:', error);
      // Don't throw - app should work with empty local database
    }
  }

  private async checkForUpdates(): Promise<void> {
    const syncStatus = offlineApiService.getOfflineStatus();
    
    if (!syncStatus.isOnline) {
      console.log('Device is offline, skipping update check');
      return;
    }

    try {
      console.log('Checking for updates...');
      
      // Sync all tables to get latest data
      await offlineApiService.syncAllTables();
      
      console.log('Update check completed');
    } catch (error) {
      console.error('Update check failed:', error);
      // Don't throw - app should continue working with existing data
    }
  }

  public async syncAllData(): Promise<void> {
    const syncStatus = offlineApiService.getOfflineStatus();
    
    if (!syncStatus.isOnline) {
      throw new Error('Cannot sync: device is offline');
    }

    try {
      console.log('Starting full data sync...');
      
      // Ensure authentication token is set
      await this.setAuthToken();
      
      // Sync all tables
      await offlineApiService.syncAllTables();
      
      // Sync pending operations
      await offlineApiService.forceSync();
      
      console.log('Full data sync completed successfully');
    } catch (error) {
      console.error('Full data sync failed:', error);
      throw error;
    }
  }

  public async syncTable(table: string): Promise<void> {
    const syncStatus = offlineApiService.getOfflineStatus();
    
    if (!syncStatus.isOnline) {
      throw new Error('Cannot sync: device is offline');
    }

    try {
      console.log(`Syncing ${table} table...`);
      
      // Ensure authentication token is set
      await this.setAuthToken();
      
      await offlineApiService.syncTable(table);
      console.log(`${table} table sync completed`);
    } catch (error) {
      console.error(`Failed to sync ${table} table:`, error);
      throw error;
    }
  }

  public async clearAllData(): Promise<void> {
    try {
      console.log('Clearing all local data...');
      
      const tables = [
        'pending_operations',
        'reports',
        'inspections',
        'agents',
        'clients',
        'properties',
        'users'
      ];
      
      for (const table of tables) {
        await database.execute(`DELETE FROM ${table}`);
      }
      
      console.log('All local data cleared');
    } catch (error) {
      console.error('Failed to clear local data:', error);
      throw error;
    }
  }

  public getSyncStatus() {
    return offlineApiService.getOfflineStatus();
  }

  public onSyncStatusChange(callback: (status: any) => void) {
    return offlineApiService.onSyncStatusChange(callback);
  }

  /**
   * Set authentication token for API client
   */
  private async setAuthToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        this.apiClient.setToken(token);
        console.log('Authentication token set for sync operations');
      } else {
        console.log('No authentication token found - sync operations may fail');
      }
    } catch (error) {
      console.error('Failed to set authentication token:', error);
    }
  }

  /**
   * Update authentication token (called after login)
   */
  public async updateAuthToken(token: string | null): Promise<void> {
    this.apiClient.setToken(token);
    if (token) {
      console.log('Authentication token updated for sync operations');
    } else {
      console.log('Authentication token cleared');
    }
  }
}

export const syncService = SyncService.getInstance();
