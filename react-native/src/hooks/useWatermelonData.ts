import { useState, useEffect } from 'react';
import { database } from '../database';
import { useAuth } from './useAuth';
import ApiClient from '../config/api';
import { syncService } from '../services/syncService';
import { offlineApiService } from '../services/offlineApiService';
import NetInfo from '@react-native-community/netinfo';

export const useWatermelonData = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading data from backend...');
      
      // Load properties from backend
      await loadProperties();
      
      // Load clients from backend
      await loadClients();
      
      // Load agents from backend
      await loadAgents();
      
      // Load reports from local database (these are created locally)
      setReports(database.reports);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      // Check network status directly
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected || false;
      
      let propertiesData: any[] = [];
      
      if (isOnline) {
        try {
          console.log('Loading properties from API...');
          const response = await ApiClient.getInstance().get<{ success: boolean; data: any[] }>('/properties');
          
          if (response.success && response.data) {
            propertiesData = response.data;
            console.log('Properties loaded from API:', propertiesData.length);
            
            // Store properties locally for offline access
            try {
              await database.init();
              for (const property of propertiesData) {
                const existingProperty = await database.findById('properties', property._id || property.id);
                if (existingProperty) {
                  await database.update('properties', property._id || property.id, {
                    ...property,
                    _isOffline: false,
                    _needsSync: false,
                    updated_at: Date.now()
                  });
                } else {
                  await database.insert('properties', {
                    ...property,
                    id: property._id || property.id,
                    _isOffline: false,
                    _needsSync: false,
                    created_at: property.createdAt || Date.now(),
                    updated_at: Date.now()
                  });
                }
              }
            } catch (dbError) {
              console.error('Failed to store properties locally:', dbError);
            }
          } else {
            console.log('API response not successful, trying local data');
            throw new Error('API response not successful');
          }
        } catch (apiError) {
          console.log('API properties failed, using local data:', apiError);
          // Fallback to local data
          try {
            await database.init();
            const localProperties = await database.findAll('properties');
            propertiesData = localProperties || [];
            console.log('Properties loaded from local database:', propertiesData.length);
          } catch (localError) {
            console.error('Failed to load local properties:', localError);
            propertiesData = [];
          }
        }
      } else {
        console.log('Device is offline, loading local properties...');
        // Use local data when offline
        try {
          await database.init();
          const localProperties = await database.findAll('properties');
          propertiesData = localProperties || [];
          console.log('Properties loaded from local database (offline):', propertiesData.length);
        } catch (localError) {
          console.error('Failed to load local properties:', localError);
          propertiesData = [];
        }
      }
      
      setProperties(propertiesData);
    } catch (error) {
      console.error('Failed to load properties:', error);
      setProperties([]);
    }
  };

  const loadClients = async () => {
    try {
      // Check network status directly
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected || false;
      
      let clientsData: any[] = [];
      
      if (isOnline) {
        try {
          console.log('Loading clients from API...');
          const response = await ApiClient.getInstance().get<{ success: boolean; data: any[] }>('/clients');
          
          if (response.success && response.data) {
            clientsData = response.data;
            console.log('Clients loaded from API:', clientsData.length);
            
            // Store clients locally for offline access
            try {
              await database.init();
              for (const client of clientsData) {
                const existingClient = await database.findById('clients', client._id || client.id);
                if (existingClient) {
                  await database.update('clients', client._id || client.id, {
                    ...client,
                    _isOffline: false,
                    _needsSync: false,
                    updated_at: Date.now()
                  });
                } else {
                  await database.insert('clients', {
                    ...client,
                    id: client._id || client.id,
                    _isOffline: false,
                    _needsSync: false,
                    created_at: client.createdAt || Date.now(),
                    updated_at: Date.now()
                  });
                }
              }
            } catch (dbError) {
              console.error('Failed to store clients locally:', dbError);
            }
          } else {
            console.log('API response not successful, trying local data');
            throw new Error('API response not successful');
          }
        } catch (apiError) {
          console.log('API clients failed, using local data:', apiError);
          // Fallback to local data
          try {
            await database.init();
            const localClients = await database.findAll('clients');
            clientsData = localClients || [];
            console.log('Clients loaded from local database:', clientsData.length);
          } catch (localError) {
            console.error('Failed to load local clients:', localError);
            clientsData = [];
          }
        }
      } else {
        console.log('Device is offline, loading local clients...');
        // Use local data when offline
        try {
          await database.init();
          const localClients = await database.findAll('clients');
          clientsData = localClients || [];
          console.log('Clients loaded from local database (offline):', clientsData.length);
        } catch (localError) {
          console.error('Failed to load local clients:', localError);
          clientsData = [];
        }
      }
      
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
    }
  };

  const loadAgents = async () => {
    try {
      // Check network status directly
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected || false;
      
      let agentsData: any[] = [];
      
      if (isOnline) {
        try {
          console.log('Loading agents from API...');
          const response = await ApiClient.getInstance().get<{ success: boolean; data: any[] }>('/agents');
          
          if (response.success && response.data) {
            agentsData = response.data;
            console.log('Agents loaded from API:', agentsData.length);
            
            // Store agents locally for offline access
            try {
              await database.init();
              for (const agent of agentsData) {
                const existingAgent = await database.findById('agents', agent._id || agent.id);
                if (existingAgent) {
                  await database.update('agents', agent._id || agent.id, {
                    ...agent,
                    _isOffline: false,
                    _needsSync: false,
                    updated_at: Date.now()
                  });
                } else {
                  await database.insert('agents', {
                    ...agent,
                    id: agent._id || agent.id,
                    _isOffline: false,
                    _needsSync: false,
                    created_at: agent.createdAt || Date.now(),
                    updated_at: Date.now()
                  });
                }
              }
            } catch (dbError) {
              console.error('Failed to store agents locally:', dbError);
            }
          } else {
            console.log('API response not successful, trying local data');
            throw new Error('API response not successful');
          }
        } catch (apiError) {
          console.log('API agents failed, using local data:', apiError);
          // Fallback to local data
          try {
            await database.init();
            const localAgents = await database.findAll('agents');
            agentsData = localAgents || [];
            console.log('Agents loaded from local database:', agentsData.length);
          } catch (localError) {
            console.error('Failed to load local agents:', localError);
            agentsData = [];
          }
        }
      } else {
        console.log('Device is offline, loading local agents...');
        // Use local data when offline
        try {
          await database.init();
          const localAgents = await database.findAll('agents');
          agentsData = localAgents || [];
          console.log('Agents loaded from local database (offline):', agentsData.length);
        } catch (localError) {
          console.error('Failed to load local agents:', localError);
          agentsData = [];
        }
      }
      
      setAgents(agentsData);
    } catch (error) {
      console.error('Failed to load agents:', error);
      setAgents([]);
    }
  };

  const unsyncedReports = database.getUnsyncedReports();

  const refreshData = async () => {
    if (user?.id) {
      await loadData();
    }
  };

  return {
    properties,
    clients,
    agents,
    reports,
    unsyncedReports,
    loading,
    refreshData,
  };
};
