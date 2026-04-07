import { database } from '../database';
import { offlineService } from './offlineService';
import { ApiClient } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateObjectId } from '../utils/objectIdUtils';

export interface OfflineApiResponse<T> {
  data: T;
  isFromCache: boolean;
  needsSync: boolean;
}

class OfflineApiService {
  private static instance: OfflineApiService;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  public static getInstance(): OfflineApiService {
    if (!OfflineApiService.instance) {
      OfflineApiService.instance = new OfflineApiService();
    }
    return OfflineApiService.instance;
  }

  // Generic CRUD operations with offline support
  public async create<T>(table: string, data: any): Promise<OfflineApiResponse<T>> {
    const id = generateObjectId();
    const timestamp = Date.now();
    
    const record = {
      id,
      ...data,
      created_at: timestamp,
      updated_at: timestamp,
      _isOffline: true,
      _needsSync: true
    };

    try {
      // Save to local database first
      await database.insert(table, record);
      
      // Queue for sync
      await offlineService.queueOperation(table, 'CREATE', record);
      
      return {
        data: record as T,
        isFromCache: true,
        needsSync: true
      };
    } catch (error) {
      console.error(`Failed to create ${table}:`, error);
      throw error;
    }
  }

  public async update<T>(table: string, id: string, data: any): Promise<OfflineApiResponse<T>> {
    const timestamp = Date.now();
    
    const updateData = {
      ...data,
      updated_at: timestamp,
      _needsSync: true
    };

    try {
      // Update local database first
      await database.update(table, id, updateData);
      
      // Get the updated record
      const updatedRecord = await database.findById(table, id);
      
      if (!updatedRecord) {
        throw new Error(`Record with id ${id} not found in ${table}`);
      }
      
      // Queue for sync
      await offlineService.queueOperation(table, 'UPDATE', updatedRecord);
      
      return {
        data: updatedRecord as T,
        isFromCache: true,
        needsSync: true
      };
    } catch (error) {
      console.error(`Failed to update ${table}:`, error);
      throw error;
    }
  }

  public async delete<T>(table: string, id: string): Promise<OfflineApiResponse<T>> {
    try {
      // Get the record before deleting
      const record = await database.findById(table, id);
      
      if (!record) {
        throw new Error(`Record with id ${id} not found in ${table}`);
      }
      
      // Delete from local database
      await database.delete(table, id);
      
      // Queue for sync
      await offlineService.queueOperation(table, 'DELETE', { id });
      
      return {
        data: record as T,
        isFromCache: true,
        needsSync: true
      };
    } catch (error) {
      console.error(`Failed to delete ${table}:`, error);
      throw error;
    }
  }

  public async findById<T>(table: string, id: string): Promise<OfflineApiResponse<T>> {
    try {
      const record = await database.findById(table, id);
      
      if (!record) {
        throw new Error(`Record with id ${id} not found in ${table}`);
      }
      
      return {
        data: record as T,
        isFromCache: true,
        needsSync: false
      };
    } catch (error) {
      console.error(`Failed to find ${table} by id:`, error);
      throw error;
    }
  }

  public async findAll<T>(table: string, where?: string, params?: any[]): Promise<OfflineApiResponse<T[]>> {
    try {
      const records = await database.findAll(table, where, params);
      
      return {
        data: records as T[],
        isFromCache: true,
        needsSync: false
      };
    } catch (error) {
      console.error(`Failed to find all ${table}:`, error);
      throw error;
    }
  }

  // Sync methods for when online
  public async syncTable(table: string): Promise<void> {
    const syncStatus = offlineService.getSyncStatus();
    
    if (!syncStatus.isOnline) {
      console.log('Cannot sync: device is offline');
      return;
    }

    try {
      // Ensure authentication token is loaded before syncing
      await this.ensureAuthToken();

      // If no token is available (user not logged in), skip syncing protected tables
      if (!this.apiClient.getToken()) {
        console.log(`Skipping sync for ${table}: no auth token`);
        return;
      }
      
      // Fetch latest data from server
      const serverData = await this.apiClient.get(`/${table}`);
      
      // Update local database with server data
      if (Array.isArray(serverData)) {
        for (const record of serverData) {
          const existingRecord = await database.findById(table, record.id);
          
          if (existingRecord) {
            // Update existing record, preserving offline changes
            const updateData = {
              ...record,
              _isOffline: false,
              _needsSync: false,
              updated_at: Date.now()
            };
            await database.update(table, record.id, updateData);
          } else {
            // Insert new record
            const insertData = {
              ...record,
              _isOffline: false,
              _needsSync: false,
              created_at: record.created_at || Date.now(),
              updated_at: Date.now()
            };
            await database.insert(table, insertData);
          }
        }
      }
      
      console.log(`Successfully synced ${table} table`);
    } catch (error) {
      console.error(`Failed to sync ${table} table:`, error);
      throw error;
    }
  }

  public async syncAllTables(): Promise<void> {
    // Only sync tables that exist on the server
    const tables = ['properties', 'clients', 'agents', 'inspections', 'reports'];
    
    for (const table of tables) {
      try {
        await this.syncTable(table);
      } catch (error) {
        console.error(`Failed to sync table ${table}:`, error);
        // Continue with other tables even if one fails
      }
    }
  }

  // Get records that need sync
  public async getRecordsNeedingSync(table: string): Promise<any[]> {
    try {
      const records = await database.findAll(table, '_needsSync = ?', [true]);
      return records;
    } catch (error) {
      console.error(`Failed to get records needing sync for ${table}:`, error);
      return [];
    }
  }

  // Mark record as synced
  public async markAsSynced(table: string, id: string): Promise<void> {
    try {
      await database.update(table, id, {
        _needsSync: false,
        _isOffline: false,
        updated_at: Date.now()
      });
    } catch (error) {
      console.error(`Failed to mark record as synced:`, error);
    }
  }

  // Get offline status
  public getOfflineStatus() {
    return offlineService.getSyncStatus();
  }

  // Subscribe to sync status changes
  public onSyncStatusChange(callback: (status: any) => void) {
    return offlineService.addSyncListener(callback);
  }

  // Force sync pending operations
  public async forceSync(): Promise<void> {
    await offlineService.forceSync();
  }

  // Queue operation for sync
  public async queueOperation(
    table: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    data: any
  ): Promise<void> {
    await offlineService.queueOperation(table, operation, data);
  }

  /**
   * Ensure authentication token is loaded from storage
   */
  private async ensureAuthToken(): Promise<void> {
    try {
      // Check if token is already set
      if (this.apiClient.getToken()) {
        return;
      }

      // Load token from storage
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        this.apiClient.setToken(token);
        console.log('Authentication token loaded for sync operation');
      } else {
        console.warn('No authentication token found - sync operations may fail');
      }
    } catch (error) {
      console.error('Failed to load authentication token:', error);
      // Continue anyway - the request will fail but we won't crash
    }
  }
}

export const offlineApiService = OfflineApiService.getInstance();
