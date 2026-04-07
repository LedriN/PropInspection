import { useState, useEffect } from 'react';
import { Inspection } from '../types';
import { useAuth } from './useAuth';
import { ApiClient } from '../config/api';
import { syncService } from '../services/syncService';
import { offlineApiService } from '../services/offlineApiService';

export const useInspections = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadInspections = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('=== LOADING INSPECTIONS FOR DASHBOARD ===');
        console.log('Current user:', user);
        
        // Use offline-first approach
        const syncStatus = syncService.getSyncStatus();
        let rawData: any[] = [];
        
        if (syncStatus.isOnline) {
          try {
            // Try to sync and get fresh data from server
            await syncService.syncTable('inspections');
            const response = await ApiClient.getInstance().get<{ data: any[] }>('/inspections');
            rawData = response.data || [];
          } catch (error) {
            console.log('Sync failed, using local data:', error);
            // Fallback to local data
            const localResponse = await offlineApiService.findAll('inspections');
            rawData = (localResponse.data || []) as any[];
          }
        } else {
          // Use local data when offline
          const localResponse = await offlineApiService.findAll('inspections');
          rawData = (localResponse.data || []) as any[];
        }
        
        console.log('Raw inspections data received:', rawData.length, 'inspections');
        
        // Transform the data to match the Inspection type
        const transformedInspections = rawData.map((inspection: any) => {
          const propertyDisplay = inspection.property_name || 
            (inspection.propertyId?.address?.street) || 
            (inspection.propertyId?.name) ||
            (typeof inspection.propertyId === 'string' ? `Property ID: ${inspection.propertyId}` : 'Property Address');
          
          const clientName = inspection.client_name || 
            (inspection.clientId?.firstName && inspection.clientId?.lastName ? `${inspection.clientId.firstName} ${inspection.clientId.lastName}` : '') ||
            (typeof inspection.clientId === 'string' ? `Client ID: ${inspection.clientId}` : 'Client Name');
          
          const agentName = inspection.inspector_name || 
            (inspection.inspectorId?.firstName && inspection.inspectorId?.lastName ? `${inspection.inspectorId.firstName} ${inspection.inspectorId.lastName}` : '') ||
            (typeof inspection.inspectorId === 'string' ? `Agent ID: ${inspection.inspectorId}` : 'Agent Name');

          return {
            id: inspection._id,
            propertyId: inspection.propertyId?._id || inspection.propertyId || '',
            property: {
              id: inspection.propertyId?._id || inspection.propertyId || '',
              address: propertyDisplay,
              type: inspection.property_type || inspection.propertyId?.propertyType || 'apartment',
              bedrooms: inspection.property_bedrooms || inspection.propertyId?.bedrooms,
              bathrooms: inspection.property_bathrooms || inspection.propertyId?.bathrooms,
              area: inspection.property_area || inspection.propertyId?.area,
              rentPrice: inspection.property_rent || inspection.propertyId?.rentPrice || 0,
              deposit: inspection.property_deposit || inspection.propertyId?.deposit || 0
            },
            clientId: inspection.clientId?._id || inspection.clientId || '',
            client: {
              id: inspection.clientId?._id || inspection.clientId || '',
              name: clientName,
              email: inspection.client_email || inspection.clientId?.email || '',
              phone: inspection.client_phone || inspection.clientId?.phone || '',
              type: inspection.client_type || inspection.clientId?.type || 'tenant'
            },
            agentId: inspection.inspectorId?._id || inspection.inspectorId || '',
            agent: {
              id: inspection.inspectorId?._id || inspection.inspectorId || '',
              name: agentName,
              email: inspection.inspector_email || inspection.inspectorId?.email || '',
              phone: inspection.inspector_phone || inspection.inspectorId?.phone || '',
              avatar: inspection.inspector_avatar || inspection.inspectorId?.avatar
            },
            type: inspection.inspectionType || 'move-in',
            status: inspection.status || 'upcoming',
            scheduledDate: inspection.scheduledDate,
            completedDate: inspection.completedDate,
            items: [],
            generalNotes: inspection.summary || inspection.notes || '',
            // Signatures are now stored only on backend, not locally
            tenantSignature: undefined,
            agentSignature: undefined,
            reportUrl: inspection.reportUrl,
            photos: [],
            videos: []
          };
        });
        
        // Filter inspections to show only those assigned to the current user
        const userInspections = transformedInspections.filter(inspection => {
          if (!user) return false;
          
          // Check if this inspection is assigned to the current user
          const isAssignedToUser = 
            // Check by inspector ID (handle both _id and id)
            (inspection.agentId === user.id || 
             inspection.agentId === user.id?.toString() ||
             inspection.agentId === (user as any)._id ||
             inspection.agentId === (user as any)._id?.toString()) ||
            // Check by inspector name
            (inspection.agent.name === user.name) ||
            (inspection.agent.name === user.email) ||
            (inspection.agent.name === user.databaseName) ||
            // Additional checks for firstName/lastName structure
            (inspection.agent.name === `${(user as any).firstName} ${(user as any).lastName}`) ||
            (inspection.agent.name === (user as any).firstName) ||
            (inspection.agent.name === (user as any).lastName);
          
          console.log(`Inspection ${inspection.id} assigned to user:`, isAssignedToUser, {
            agentId: inspection.agentId,
            agentName: inspection.agent.name,
            userId: user.id,
            user_id: (user as any)._id,
            userName: user.name,
            userFirstName: (user as any).firstName,
            userLastName: (user as any).lastName,
            userEmail: user.email
          });
          
          return isAssignedToUser;
        });
        
        console.log(`Filtered ${userInspections.length} inspections for current user out of ${transformedInspections.length} total`);
        setInspections(userInspections);
      } catch (error) {
        console.error('Failed to load inspections:', error);
        setInspections([]);
      } finally {
        setLoading(false);
      }
    };

    loadInspections();
  }, [user]);

  const updateInspection = async (updatedInspection: Inspection) => {
    if (!user) return;
    
    try {
      // Update via API
      await ApiClient.getInstance().put(`/inspections/${updatedInspection.id}`, updatedInspection);
      
      const updated = inspections.map(inspection =>
        inspection.id === updatedInspection.id ? updatedInspection : inspection
      );
      setInspections(updated);
    } catch (error) {
      console.error('Failed to update inspection:', error);
    }
  };

  const getInspectionById = async (id: string): Promise<Inspection | null> => {
    try {
      const response = await ApiClient.getInstance().get(`/inspections/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get inspection:', error);
      return null;
    }
  };

  const refreshInspections = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('=== REFRESHING INSPECTIONS FOR DASHBOARD ===');
      
      // Use offline-first approach
      const syncStatus = syncService.getSyncStatus();
      let rawData: any[] = [];
      
      if (syncStatus.isOnline) {
        try {
          // Try to sync and get fresh data from server
          await syncService.syncTable('inspections');
          const response = await ApiClient.getInstance().get<{ data: any[] }>('/inspections');
          rawData = response.data || [];
        } catch (error) {
          console.log('Sync failed, using local data:', error);
          // Fallback to local data
          const localResponse = await offlineApiService.findAll('inspections');
          rawData = (localResponse.data || []) as any[];
        }
      } else {
        // Use local data when offline
        const localResponse = await offlineApiService.findAll('inspections');
        rawData = (localResponse.data || []) as any[];
      }
      
      console.log('Raw inspections data received:', rawData.length, 'inspections');
      
      // Transform the data to match the Inspection type
      const transformedInspections = rawData.map((inspection: any) => {
        const propertyDisplay = inspection.property_name || 
          (inspection.propertyId?.address?.street) || 
          (inspection.propertyId?.name) ||
          (typeof inspection.propertyId === 'string' ? `Property ID: ${inspection.propertyId}` : 'Property Address');
        
        const clientName = inspection.client_name || 
          (inspection.clientId?.firstName && inspection.clientId?.lastName ? `${inspection.clientId.firstName} ${inspection.clientId.lastName}` : '') ||
          (typeof inspection.clientId === 'string' ? `Client ID: ${inspection.clientId}` : 'Client Name');
        
        const agentName = inspection.inspector_name || 
          (inspection.inspectorId?.firstName && inspection.inspectorId?.lastName ? `${inspection.inspectorId.firstName} ${inspection.inspectorId.lastName}` : '') ||
          (typeof inspection.inspectorId === 'string' ? `Agent ID: ${inspection.inspectorId}` : 'Agent Name');

        return {
          id: inspection._id,
          propertyId: inspection.propertyId?._id || inspection.propertyId || '',
          property: {
            id: inspection.propertyId?._id || inspection.propertyId || '',
            address: propertyDisplay,
            type: inspection.property_type || inspection.propertyId?.propertyType || 'apartment',
            bedrooms: inspection.property_bedrooms || inspection.propertyId?.bedrooms,
            bathrooms: inspection.property_bathrooms || inspection.propertyId?.bathrooms,
            area: inspection.property_area || inspection.propertyId?.area,
            rentPrice: inspection.property_rent || inspection.propertyId?.rentPrice || 0,
            deposit: inspection.property_deposit || inspection.propertyId?.deposit || 0
          },
          clientId: inspection.clientId?._id || inspection.clientId || '',
          client: {
            id: inspection.clientId?._id || inspection.clientId || '',
            name: clientName,
            email: inspection.client_email || inspection.clientId?.email || '',
            phone: inspection.client_phone || inspection.clientId?.phone || '',
            type: inspection.client_type || inspection.clientId?.type || 'tenant'
          },
          agentId: inspection.inspectorId?._id || inspection.inspectorId || '',
          agent: {
            id: inspection.inspectorId?._id || inspection.inspectorId || '',
            name: agentName,
            email: inspection.inspector_email || inspection.inspectorId?.email || '',
            phone: inspection.inspector_phone || inspection.inspectorId?.phone || '',
            avatar: inspection.inspector_avatar || inspection.inspectorId?.avatar
          },
          type: inspection.inspectionType || 'move-in',
          status: inspection.status || 'upcoming',
          scheduledDate: inspection.scheduledDate,
          completedDate: inspection.completedDate,
          items: [],
          generalNotes: inspection.summary || inspection.notes || '',
          // Signatures are now stored only on backend, not locally
          tenantSignature: undefined,
          agentSignature: undefined,
          reportUrl: inspection.reportUrl,
          photos: [],
          videos: []
        };
      });
      
      // Filter inspections to show only those assigned to the current user
      const userInspections = transformedInspections.filter(inspection => {
        if (!user) return false;
        
        // Check if this inspection is assigned to the current user
        const isAssignedToUser = 
          // Check by inspector ID (handle both _id and id)
          (inspection.agentId === user.id || 
           inspection.agentId === user.id?.toString() ||
           inspection.agentId === (user as any)._id ||
           inspection.agentId === (user as any)._id?.toString()) ||
          // Check by inspector name
          (inspection.agent.name === user.name) ||
          (inspection.agent.name === user.email) ||
          (inspection.agent.name === user.databaseName) ||
          // Additional checks for firstName/lastName structure
          (inspection.agent.name === `${(user as any).firstName} ${(user as any).lastName}`) ||
          (inspection.agent.name === (user as any).firstName) ||
          (inspection.agent.name === (user as any).lastName);
        
        return isAssignedToUser;
      });
      
      console.log(`Refreshed ${userInspections.length} inspections for current user out of ${transformedInspections.length} total`);
      setInspections(userInspections);
    } catch (error) {
      console.error('Failed to refresh inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    inspections,
    loading,
    updateInspection,
    getInspectionById,
    refreshInspections
  };
};