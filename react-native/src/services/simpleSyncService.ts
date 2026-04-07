import { database } from '../database';
import ApiClient, { ApiError } from '../config/api';
import NetInfo from '@react-native-community/netinfo';
import { isValidObjectId } from '../utils/objectIdUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SimpleSyncService {
  private isSyncing = false;
  private isOnline = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected || false;
      console.log('Network state changed:', this.isOnline ? 'Online' : 'Offline');
      if (this.isOnline) {
        this.triggerSync();
      }
    });
    this.checkInitialNetworkState();
  }

  private async checkInitialNetworkState() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected || false;
    console.log('Initial network state:', this.isOnline ? 'Online' : 'Offline');
    if (this.isOnline) {
      this.triggerSync();
    }
  }

  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }

  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.triggerSync();
      }
    }, intervalMs);
    console.log(`Simple sync interval started (${intervalMs / 1000}s)`);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Simple sync interval stopped');
    }
  }

  async triggerSync() {
    if (this.isSyncing || !this.isOnline) {
      console.log('Skipping sync: already syncing or offline.');
      return;
    }

    this.isSyncing = true;
    console.log('Starting simple sync...');

    try {
      await this.syncReports();
      console.log('Simple sync completed successfully.');
    } catch (error) {
      console.error('Simple sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncReports() {
    console.log('Syncing reports...');
    
    // Ensure authentication token is loaded before syncing
    await this.ensureAuthToken();
    
    // First, check for deleted reports on the server
    await this.checkForDeletedReports();
    
    // Get unsynced reports
    const unsyncedReports = database.reports.filter((report: any) => !report.isSynced);
    console.log(`Found ${unsyncedReports.length} unsynced reports`);

    for (const localReport of unsyncedReports) {
      try {
        console.log(`Attempting to sync report ${localReport.id} to backend...`);
        console.log('Report data:', {
          id: localReport.id,
          title: localReport.title,
          generatedAt: localReport.generatedAt,
          generatedAtType: typeof localReport.generatedAt,
          generatedAtInstance: localReport.generatedAt instanceof Date
        });
        
        // Create FormData for the report
        const formData = new FormData();
        
        // Append basic report data
        formData.append('title', localReport.title);
        formData.append('report_type', localReport.reportType);
        formData.append('property_name', localReport.propertyName);
        formData.append('agent_name', localReport.agentName);
        formData.append('client_name', localReport.clientName);
        formData.append('property_id', localReport.propertyId);
        formData.append('agent_id', localReport.agentId);
        formData.append('client_id', localReport.clientId);
        formData.append('status', localReport.status);
        // Handle generatedAt - ensure it's a valid Date
        const generatedAt = localReport.generatedAt ? 
          (localReport.generatedAt instanceof Date ? 
            localReport.generatedAt : 
            new Date(localReport.generatedAt)
          ) : 
          new Date();
        formData.append('generated_at', generatedAt.toISOString());
        formData.append('generated_by', localReport.generatedBy);
        formData.append('agent_email', localReport.agentEmail || '');
        formData.append('client_email', localReport.clientEmail || '');
        // Include unique identifier for better tracking
        if (localReport.uniqueIdentifier) {
          formData.append('unique_identifier', localReport.uniqueIdentifier);
        }

        // Create content without images and signatures for JSON serialization
        const contentWithoutFiles = {
          ...localReport.content,
          images: {}, // Will be populated by server from uploaded files
          signatures: {} // Will be populated by server from uploaded files
        };
        formData.append('content', JSON.stringify(contentWithoutFiles));

        // Handle signatures if they exist - only upload local files
        if (localReport.content?.signatures?.agent) {
          const agentSig = localReport.content.signatures.agent;
          if (agentSig.uri && agentSig.uri.startsWith('file://')) {
            console.log('Syncing agent signature:', agentSig.uri);
            formData.append('agentSignature', {
              uri: agentSig.uri,
              name: agentSig.name || 'agent_signature.png',
              type: agentSig.type || 'image/png',
            } as any);
          }
        }
        
        if (localReport.content?.signatures?.client) {
          const clientSig = localReport.content.signatures.client;
          if (clientSig.uri && clientSig.uri.startsWith('file://')) {
            console.log('Syncing client signature:', clientSig.uri);
            formData.append('clientSignature', {
              uri: clientSig.uri,
              name: clientSig.name || 'client_signature.png',
              type: clientSig.type || 'image/png',
            } as any);
          }
        }

        // Handle images if they exist - only upload local files
        if (localReport.content?.images) {
          console.log('Processing images for sync upload...');
          Object.keys(localReport.content.images).forEach(area => {
            Object.keys(localReport.content.images[area]).forEach(field => {
              const images = localReport.content.images[area][field];
              if (Array.isArray(images)) {
                images.forEach((image, index) => {
                  // Only upload local files (file:// URIs)
                  if (image.uri && image.uri.startsWith('file://')) {
                    console.log(`Syncing image: ${area}.${field}[${index}] = ${image.uri}`);
                    formData.append(`images[${area}][${field}]`, {
                      uri: image.uri,
                      name: image.name || `image_${Date.now()}_${index}.jpg`,
                      type: image.type || 'image/jpeg',
                    } as any);
                  } else if (image.uri) {
                    console.log(`Skipping non-local image during sync: ${area}.${field}[${index}] = ${image.uri}`);
                  }
                });
              }
            });
          });
        }

        // Send to backend
        const response = await ApiClient.getInstance().post<{ data: any }>('/reports', formData);
        console.log(`Report ${localReport.id} synced to backend. Server ID: ${response.data._id}`);
        console.log('Server response data:', response.data);

        // Update local report with server response data (including processed images)
        // Store the original local ID for reference
        const originalLocalId = localReport.id;
        localReport.id = response.data._id; // Update to server ID
        localReport.isSynced = true;
        localReport.syncError = null;
        localReport.updatedAt = new Date();
        
        // Add a reference to the original local ID for debugging
        localReport.originalLocalId = originalLocalId;
        
        // Update content with server-processed data (including image URLs)
        if (response.data.content) {
          console.log('Updating local report content with server data...');
          localReport.content = response.data.content;
        }
        
        // Save to database
        await database.save();
        
        console.log(`Report successfully synced: ${originalLocalId} -> ${response.data._id}`);
        
      } catch (error: any) {
        console.error(`Failed to sync report ${localReport.id}:`, error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          reportData: {
            id: localReport.id,
            title: localReport.title,
            generatedAt: localReport.generatedAt,
            generatedAtType: typeof localReport.generatedAt
          }
        });
        
        localReport.syncError = error.message || 'Unknown sync error';
        localReport.updatedAt = new Date();
        await database.save();
      }
    }
  }

  private async checkForDeletedReports() {
    console.log('Checking for deleted reports on server...');
    
    try {
      const apiClient = ApiClient.getInstance();
      
      // Verify we have a token before making the request
      if (!apiClient.getToken()) {
        console.log('Skipping deleted reports check: no authentication token');
        return;
      }
      
      // Get all synced reports from local database
      const syncedReports = database.reports.filter((report: any) => report.isSynced);
      console.log(`Found ${syncedReports.length} synced reports locally`);
      
      if (syncedReports.length === 0) {
        console.log('No synced reports to check for deletion');
        return;
      }
      
      // Get all report IDs from server
      const response = await apiClient.get<{ data: any[] }>('/reports');
      const serverReports = response.data || [];
      const serverReportIds = new Set(serverReports.map((report: any) => report._id));
      
      console.log(`Found ${serverReportIds.size} reports on server`);
      
      // Check each local synced report against server
      const reportsToDelete: string[] = [];
      
      for (const localReport of syncedReports) {
        // Check if the report still exists on the server
        if (!serverReportIds.has(localReport.id)) {
          console.log(`Report ${localReport.id} (${localReport.title}) no longer exists on server - marking for deletion`);
          reportsToDelete.push(localReport.id);
        }
      }
      
      // Remove deleted reports from local database
      if (reportsToDelete.length > 0) {
        console.log(`Removing ${reportsToDelete.length} deleted reports from local database`);
        
        for (const reportId of reportsToDelete) {
          const deletedReport = await database.delete('reports', reportId);
          if (deletedReport) {
            console.log(`Successfully removed deleted report: ${reportId} (${deletedReport.title})`);
          }
        }
        
        // Save the database after deletions
        await database.save();
        console.log('Local database updated after removing deleted reports');
      } else {
        console.log('No reports need to be deleted locally');
      }
      
    } catch (error) {
      // Handle authentication errors gracefully
      if (error instanceof ApiError && (error.status === 401 || error.message.includes('Access token required'))) {
        console.log('Skipping deleted reports check: authentication required');
        return; // Don't log as error, just skip
      }
      console.error('Error checking for deleted reports:', error);
      // Don't throw the error - we don't want to break the sync process
    }
  }

  async syncAll() {
    return this.triggerSync();
  }

  // Public method to manually check for deleted reports
  async checkForDeletedReportsManually() {
    if (!this.isOnline) {
      console.log('Cannot check for deleted reports: offline');
      return;
    }
    
    try {
      // Ensure authentication token is loaded
      await this.ensureAuthToken();
      
      // Check if we have a valid token before proceeding
      const apiClient = ApiClient.getInstance();
      if (!apiClient.getToken()) {
        console.log('Skipping deleted reports check: user not authenticated');
        return;
      }
      
      await this.checkForDeletedReports();
      console.log('Manual deletion check completed');
    } catch (error) {
      // Handle ApiError specifically (e.g., 401 Unauthorized)
      if (error instanceof ApiError && (error.status === 401 || error.message.includes('Access token required'))) {
        console.log('Skipping deleted reports check: authentication required');
        return; // Gracefully skip instead of logging as error
      }
      console.error('Error in manual deletion check:', error);
    }
  }

  /**
   * Ensure authentication token is loaded from storage
   */
  private async ensureAuthToken(): Promise<void> {
    try {
      const apiClient = ApiClient.getInstance();
      
      // Check if token is already set
      if (apiClient.getToken()) {
        return;
      }

      // Load token from storage
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        apiClient.setToken(token);
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

export const simpleSyncService = new SimpleSyncService();
