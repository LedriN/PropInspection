import { useState, useEffect } from 'react';
import { ApiClient } from '../config/api';
import { useAuth } from './useAuth';
import { syncService } from '../services/syncService';
import { offlineApiService } from '../services/offlineApiService';

export interface Report {
  id: string;
  title: string;
  property: string;
  client: string;
  agent: string;
  type: string;
  date: string;
  status: string;
  propertyId?: string;
  clientId?: string;
  agentId?: string;
}

export const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadReports = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use offline-first approach
      const syncStatus = syncService.getSyncStatus();
      let rawData: any[] = [];
      
      if (syncStatus.isOnline) {
        try {
          // Try to sync and get fresh data from server
          await syncService.syncTable('reports');
          const response = await ApiClient.getInstance().get<{ data: any[] }>('/reports');
          rawData = response.data || [];
        } catch (error) {
          console.log('Sync failed, using local data:', error);
          // Fallback to local data
          const localResponse = await offlineApiService.findAll('reports');
          rawData = (localResponse.data || []) as any[];
        }
      } else {
        // Use local data when offline
        const localResponse = await offlineApiService.findAll('reports');
        rawData = (localResponse.data || []) as any[];
      }
      
      // Transform the data to match the expected format and filter by current user
      const transformedReports = rawData
        .filter((report: any) => {
          // Filter reports by current user's ID
          const reportAgentId = report.agent_id?._id || report.agent_id;
          return reportAgentId === user.id;
        })
        .map((report: any) => {
          const propertyAddress = report.property_name || 
            (report.property_id?.address?.street) || 
            (typeof report.property_id === 'string' ? `Property ID: ${report.property_id}` : 'Property Address');
          
          const clientName = report.client_name || 
            (report.client_id?.firstName && report.client_id?.lastName ? `${report.client_id.firstName} ${report.client_id.lastName}` : '') ||
            (typeof report.client_id === 'string' ? `Client ID: ${report.client_id}` : 'Client Name');
          
          const agentName = report.agent_name || 
            (report.agent_id?.firstName && report.agent_id?.lastName ? `${report.agent_id.firstName} ${report.agent_id.lastName}` : '') ||
            (typeof report.agent_id === 'string' ? `Agent ID: ${report.agent_id}` : 'Agent Name');

          return {
            id: report._id,
            title: report.title || report.reportType || 'Untitled Report',
            property: propertyAddress,
            client: clientName,
            agent: agentName,
            type: report.reportType || report.type || 'inspection',
            date: report.createdAt ? new Date(report.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            status: report.status || 'Draft',
            propertyId: report.property_id,
            clientId: report.client_id,
            agentId: report.agent_id
          };
        });

      setReports(transformedReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setError(error instanceof Error ? error.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const refreshReports = () => {
    loadReports();
  };

  return {
    reports,
    loading,
    error,
    refreshReports
  };
};
