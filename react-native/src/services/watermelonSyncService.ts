import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import ApiClient from '../config/api';
import NetInfo from '@react-native-community/netinfo';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: Date;
  error?: string;
}

class WatermelonSyncService {
  private isOnline = false;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log('Network status changed:', { 
        wasOnline, 
        isOnline: this.isOnline,
        type: state.type 
      });

      // If we just came online, trigger sync
      if (!wasOnline && this.isOnline) {
        this.syncAll();
      }
    });
  }

  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }

  async syncAll(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    console.log('Starting sync...');

    try {
      await Promise.all([
        this.syncReports(),
        this.syncProperties(),
        this.syncClients(),
        this.syncAgents(),
      ]);

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async syncReports(): Promise<void> {
    console.log('Syncing reports...');
    
    // Get unsynced reports
    const unsyncedReports = await database.get('reports')
      .query(Q.where('is_synced', false))
      .fetch();

    console.log(`Found ${unsyncedReports.length} unsynced reports`);

    for (const report of unsyncedReports) {
      try {
        await this.syncReport(report);
      } catch (error) {
        console.error(`Failed to sync report ${report.id}:`, error);
        // Mark as sync error but don't fail the entire sync
        await database.write(async () => {
          await report.update(report => {
            report.syncError = error instanceof Error ? error.message : 'Unknown error';
          });
        });
      }
    }
  }

  private async syncReport(report: any): Promise<void> {
    console.log(`Syncing report: ${report.title}`);

    // Create FormData for multipart upload
    const formData = new FormData();
    
    // Add basic report data
    formData.append('title', report.title);
    formData.append('report_type', report.reportType);
    formData.append('property_name', report.propertyName);
    formData.append('agent_name', report.agentName);
    formData.append('client_name', report.clientName);
    formData.append('property_id', report.propertyId || '');
    formData.append('agent_id', report.agentId || '');
    formData.append('client_id', report.clientId || '');
    
    // Add content
    formData.append('content', report.content);
    
    // Add inspection data
    const parsedContent = report.parsedContent;
    if (parsedContent.inspectionData) {
      formData.append('inspectionData', JSON.stringify(parsedContent.inspectionData));
    }

    // Handle signatures and images from parsed content
    if (parsedContent.signatures) {
      if (parsedContent.signatures.agent) {
        formData.append('agentSignature', parsedContent.signatures.agent);
      }
      if (parsedContent.signatures.client) {
        formData.append('clientSignature', parsedContent.signatures.client);
      }
    }

    // Handle images
    if (parsedContent.images) {
      Object.keys(parsedContent.images).forEach(area => {
        Object.keys(parsedContent.images[area]).forEach(field => {
          const images = parsedContent.images[area][field];
          if (Array.isArray(images)) {
            images.forEach((image, index) => {
              if (image.uri && image.uri.startsWith('file://')) {
                const fieldName = `images[${area}][${field}]`;
                formData.append(fieldName, image);
              }
            });
          }
        });
      });
    }

    // Send to backend
    const response = await ApiClient.getInstance().post('/reports', formData);
    
    if (response.data) {
      // Mark as synced
      await database.write(async () => {
        await report.update(report => {
          report.isSynced = true;
          report.syncError = null;
          report.updatedAt = new Date();
        });
      });
      
      console.log(`Report ${report.id} synced successfully`);
    }
  }

  async syncProperties(): Promise<void> {
    console.log('Syncing properties...');
    // Implementation for syncing properties from backend
    // This would fetch properties from the API and update the local database
  }

  async syncClients(): Promise<void> {
    console.log('Syncing clients...');
    // Implementation for syncing clients from backend
  }

  async syncAgents(): Promise<void> {
    console.log('Syncing agents...');
    // Implementation for syncing agents from backend
  }

  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncAll().catch(error => {
          console.error('Auto sync failed:', error);
        });
      }
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const watermelonSyncService = new WatermelonSyncService();
