import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';

export const useOfflineData = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = async () => {
    try {
      setLoading(true);
      
      // Load sample data for demo purposes
      const sampleProperties = [
        {
          id: 'prop_1',
          address: '123 Main Street',
          type: 'Apartment',
          bedrooms: 2,
          bathrooms: 1,
          area: 800,
          rentPrice: 1200,
          deposit: 1200,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'prop_2',
          address: '456 Oak Avenue',
          type: 'House',
          bedrooms: 3,
          bathrooms: 2,
          area: 1200,
          rentPrice: 1800,
          deposit: 1800,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const sampleClients = [
        {
          id: 'client_1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-0123',
          type: 'Tenant',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'client_2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-0456',
          type: 'Tenant',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const sampleAgents = [
        {
          id: user?.id || 'agent_1',
          name: user?.name || 'Current Agent',
          email: user?.email || 'agent@example.com',
          phone: '555-0789',
          avatar: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Load existing reports from AsyncStorage
      const existingReports = await AsyncStorage.getItem('offline_reports');
      const savedReports = existingReports ? JSON.parse(existingReports) : [];

      setProperties(sampleProperties);
      setClients(sampleClients);
      setAgents(sampleAgents);
      setReports(savedReports);

    } catch (error) {
      console.error('Failed to load offline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async (reportData: any) => {
    try {
      const existingReports = await AsyncStorage.getItem('offline_reports');
      const reports = existingReports ? JSON.parse(existingReports) : [];
      reports.push(reportData);
      await AsyncStorage.setItem('offline_reports', JSON.stringify(reports));
      setReports(reports);
      return reportData;
    } catch (error) {
      console.error('Failed to save report:', error);
      throw error;
    }
  };

  const unsyncedReports = reports.filter((report: any) => !report.isSynced);

  return {
    properties,
    clients,
    agents,
    reports,
    unsyncedReports,
    loading,
    saveReport,
    refreshData: loadOfflineData
  };
};
