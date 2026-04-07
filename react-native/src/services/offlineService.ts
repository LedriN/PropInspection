import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';
import { ApiClient } from '../config/api';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  isSyncing: boolean;
}

export interface PendingOperation {
  id: string;
  table: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean = false;
  private lastSyncTime: Date | null = null;
  private pendingOperations: PendingOperation[] = [];
  private isSyncing: boolean = false;
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
    this.initializeNetworkListener();
    // Don't load pending operations here - wait for database to be initialized
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  public async initialize(): Promise<void> {
    // Load pending operations after database is initialized
    await this.loadPendingOperations();
  }

  private async initializeNetworkListener(): Promise<void> {
    // Check initial network state
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;

    // Listen for network state changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log(`Network state changed: ${wasOnline ? 'online' : 'offline'} -> ${this.isOnline ? 'online' : 'offline'}`);
      
      this.notifyListeners();
      
      // Auto-sync when coming back online
      if (!wasOnline && this.isOnline) {
        this.syncPendingOperations();
      }
    });
  }

  private async loadPendingOperations(): Promise<void> {
    try {
      const operations = await database.findAll('pending_operations');
      this.pendingOperations = operations.map(op => ({
        id: op.id,
        table: op['table'],
        operation: op.operation,
        data: JSON.parse(op.data),
        timestamp: op.timestamp,
        retryCount: op.retryCount || 0
      }));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  }

  private async savePendingOperation(operation: PendingOperation): Promise<void> {
    try {
      await database.insert('pending_operations', {
        id: operation.id,
        'table': operation.table,
        operation: operation.operation,
        data: JSON.stringify(operation.data),
        timestamp: operation.timestamp,
        retryCount: operation.retryCount
      });
      this.pendingOperations.push(operation);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save pending operation:', error);
    }
  }

  private async removePendingOperation(operationId: string): Promise<void> {
    try {
      await database.delete('pending_operations', operationId);
      this.pendingOperations = this.pendingOperations.filter(op => op.id !== operationId);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to remove pending operation:', error);
    }
  }

  private async updatePendingOperationRetryCount(operationId: string, retryCount: number): Promise<void> {
    try {
      await database.update('pending_operations', operationId, { retryCount });
      const operation = this.pendingOperations.find(op => op.id === operationId);
      if (operation) {
        operation.retryCount = retryCount;
      }
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to update pending operation retry count:', error);
    }
  }

  private notifyListeners(): void {
    const status: SyncStatus = {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      pendingOperations: this.pendingOperations.length,
      isSyncing: this.isSyncing
    };

    this.syncListeners.forEach(listener => listener(status));
  }

  public addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      pendingOperations: this.pendingOperations.length,
      isSyncing: this.isSyncing
    };
  }

  public async syncPendingOperations(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.pendingOperations.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    console.log(`Starting sync of ${this.pendingOperations.length} pending operations`);

    const operationsToSync = [...this.pendingOperations];
    let successCount = 0;
    let failureCount = 0;

    for (const operation of operationsToSync) {
      try {
        await this.executeOperation(operation);
        await this.removePendingOperation(operation.id);
        successCount++;
        console.log(`Successfully synced operation ${operation.id}`);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        // Increment retry count
        const newRetryCount = operation.retryCount + 1;
        await this.updatePendingOperationRetryCount(operation.id, newRetryCount);
        
        // Remove operation if it has exceeded max retries
        if (newRetryCount >= 3) {
          console.log(`Operation ${operation.id} exceeded max retries, removing from queue`);
          await this.removePendingOperation(operation.id);
        }
        
        failureCount++;
      }
    }

    this.lastSyncTime = new Date();
    this.isSyncing = false;
    this.notifyListeners();

    console.log(`Sync completed: ${successCount} successful, ${failureCount} failed`);
  }

  private async executeOperation(operation: PendingOperation): Promise<void> {
    const { table, operation: op, data } = operation;

    switch (op) {
      case 'CREATE':
        await this.apiClient.post(`/${table}`, data);
        break;
      case 'UPDATE':
        await this.apiClient.put(`/${table}/${data.id}`, data);
        break;
      case 'DELETE':
        await this.apiClient.delete(`/${table}/${data.id}`);
        break;
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }

  public async queueOperation(
    table: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    data: any
  ): Promise<void> {
    const pendingOp: PendingOperation = {
      id: database.generateId(),
      table,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    await this.savePendingOperation(pendingOp);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingOperations();
    }
  }

  public async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingOperations();
    }
  }

  public async clearPendingOperations(): Promise<void> {
    try {
      await database.execute('DELETE FROM pending_operations');
      this.pendingOperations = [];
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to clear pending operations:', error);
    }
  }
}

export const offlineService = OfflineService.getInstance();
