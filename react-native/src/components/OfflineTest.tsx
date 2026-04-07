import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { offlineService } from '../services/offlineService';
import { offlineApiService } from '../services/offlineApiService';
import { database } from '../database';

const OfflineTest: React.FC = () => {
  const { colors } = useTheme();
  const [syncStatus, setSyncStatus] = useState(offlineService.getSyncStatus());
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = offlineService.addSyncListener((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testOfflineFunctionality = async () => {
    setTestResults([]);
    addTestResult('Starting offline functionality test...');

    try {
      // Test 1: Database initialization
      addTestResult('Test 1: Initializing database...');
      await database.init();
      addTestResult('✓ Database initialized successfully');

      // Test 2: Create test data offline
      addTestResult('Test 2: Creating test data offline...');
      const testData = {
        id: 'test-' + Date.now(),
        name: 'Test Property',
        address: '123 Test Street',
        type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        area: 1000,
        rent_price: 1500,
        deposit: 3000,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      await offlineApiService.create('properties', testData);
      addTestResult('✓ Test data created successfully');

      // Test 3: Read data offline
      addTestResult('Test 3: Reading data offline...');
      const localData = await offlineApiService.findAll('properties');
      addTestResult(`✓ Found ${localData.data.length} properties in local database`);

      // Test 4: Network status
      addTestResult(`Test 4: Network status - ${syncStatus.isOnline ? 'Online' : 'Offline'}`);
      addTestResult(`✓ Pending operations: ${syncStatus.pendingOperations}`);

      addTestResult('🎉 All offline tests passed!');

    } catch (error) {
      addTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearTestData = async () => {
    try {
      await database.execute('DELETE FROM properties WHERE id LIKE "test-%"');
      setTestResults([]);
      Alert.alert('Success', 'Test data cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear test data');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <Text style={[styles.title, { color: colors.gray[900] }]}>Offline Functionality Test</Text>
      
      <View style={[styles.statusCard, { backgroundColor: colors.gray[50] }]}>
        <Text style={[styles.statusTitle, { color: colors.gray[700] }]}>Current Status</Text>
        <Text style={[styles.statusText, { color: syncStatus.isOnline ? colors.success : colors.error }]}>
          {syncStatus.isOnline ? 'Online' : 'Offline'}
        </Text>
        <Text style={[styles.statusText, { color: colors.gray[600] }]}>
          Pending Operations: {syncStatus.pendingOperations}
        </Text>
        {syncStatus.lastSyncTime && (
          <Text style={[styles.statusText, { color: colors.gray[600] }]}>
            Last Sync: {syncStatus.lastSyncTime.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: colors.primary }]}
        onPress={testOfflineFunctionality}
      >
        <Text style={[styles.buttonText, { color: colors.white }]}>Run Offline Test</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.clearButton, { backgroundColor: colors.error }]}
        onPress={clearTestData}
      >
        <Text style={[styles.buttonText, { color: colors.white }]}>Clear Test Data</Text>
      </TouchableOpacity>

      <View style={[styles.resultsContainer, { backgroundColor: colors.gray[50] }]}>
        <Text style={[styles.resultsTitle, { color: colors.gray[700] }]}>Test Results</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={[styles.resultText, { color: colors.gray[600] }]}>
            {result}
          </Text>
        ))}
      </View>
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
    marginBottom: 20,
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
  testButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  clearButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default OfflineTest;
