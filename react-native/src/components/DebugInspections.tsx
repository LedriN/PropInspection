import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useInspections } from '../hooks/useInspections';
import { offlineApiService } from '../services/offlineApiService';
import { syncService } from '../services/syncService';

const DebugInspections: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { inspections, loading } = useInspections();
  const [localInspections, setLocalInspections] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());

  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const localResponse = await offlineApiService.findAll('inspections');
        setLocalInspections(localResponse.data || []);
      } catch (error) {
        console.error('Failed to load local inspections:', error);
      }
    };

    loadLocalData();
  }, []);

  useEffect(() => {
    const unsubscribe = syncService.addSyncListener((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const refreshData = async () => {
    try {
      const localResponse = await offlineApiService.findAll('inspections');
      setLocalInspections(localResponse.data || []);
    } catch (error) {
      console.error('Failed to refresh local data:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <Text style={[styles.title, { color: colors.gray[900] }]}>Debug Inspections</Text>
      
      <View style={[styles.statusCard, { backgroundColor: colors.gray[50] }]}>
        <Text style={[styles.statusTitle, { color: colors.gray[700] }]}>Status</Text>
        <Text style={[styles.statusText, { color: colors.gray[600] }]}>
          Network: {syncStatus.isOnline ? 'Online' : 'Offline'}
        </Text>
        <Text style={[styles.statusText, { color: colors.gray[600] }]}>
          User: {user?.name} (ID: {user?.id})
        </Text>
        <Text style={[styles.statusText, { color: colors.gray[600] }]}>
          Loading: {loading ? 'Yes' : 'No'}
        </Text>
      </View>

      <View style={[styles.dataCard, { backgroundColor: colors.gray[50] }]}>
        <Text style={[styles.dataTitle, { color: colors.gray[700] }]}>Hook Data</Text>
        <Text style={[styles.dataText, { color: colors.gray[600] }]}>
          Inspections from useInspections: {inspections.length}
        </Text>
        {inspections.map((inspection, index) => (
          <Text key={index} style={[styles.dataText, { color: colors.gray[600] }]}>
            {index + 1}. {inspection.id} - {inspection.property.address} - Agent: {inspection.agent.name}
          </Text>
        ))}
      </View>

      <View style={[styles.dataCard, { backgroundColor: colors.gray[50] }]}>
        <Text style={[styles.dataTitle, { color: colors.gray[700] }]}>Local Database</Text>
        <Text style={[styles.dataText, { color: colors.gray[600] }]}>
          Local inspections: {localInspections.length}
        </Text>
        {localInspections.map((inspection, index) => (
          <Text key={index} style={[styles.dataText, { color: colors.gray[600] }]}>
            {index + 1}. {inspection._id || inspection.id} - {inspection.property_name || 'No property name'} - Inspector: {inspection.inspector_name || 'No inspector'}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: colors.primary }]}
        onPress={refreshData}
      >
        <Text style={[styles.buttonText, { color: colors.white }]}>Refresh Local Data</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  dataCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  dataText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  refreshButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DebugInspections;
