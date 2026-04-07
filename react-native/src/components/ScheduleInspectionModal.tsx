import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import ApiClient from '../config/api';

const { width } = Dimensions.get('window');

interface Property {
  _id: string;
  name?: string;
  address?: {
    street?: string;
    city?: string;
  };
  _user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  _database?: string;
}

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  _database?: string;
}

interface Agent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  _isCurrentUser?: boolean;
  _database?: string;
}

interface ScheduleInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInspectionScheduled: () => void;
  editingInspection?: any;
}

const ScheduleInspectionModal: React.FC<ScheduleInspectionModalProps> = ({
  isOpen,
  onClose,
  onInspectionScheduled,
  editingInspection
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [formData, setFormData] = useState({
    propertyId: '',
    clientId: '',
    agentId: '',
    inspectionType: 'routine',
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (editingInspection) {
        setFormData({
          propertyId: editingInspection.propertyId || '',
          clientId: editingInspection.clientId || '',
          agentId: editingInspection.agentId || '',
          inspectionType: editingInspection.type?.toLowerCase() || 'routine',
          scheduledDate: editingInspection.date?.toISOString().split('T')[0] || '',
          scheduledTime: editingInspection.time || '',
          notes: editingInspection.notes || ''
        });
      } else {
        setFormData({
          propertyId: '',
          clientId: '',
          agentId: user?.id || '',
          inspectionType: 'routine',
          scheduledDate: '',
          scheduledTime: '',
          notes: ''
        });
      }
    }
  }, [isOpen, editingInspection, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load properties, clients, and agents in parallel
      const [propertiesResponse, clientsResponse, agentsResponse] = await Promise.all([
        ApiClient.getInstance().get<{ data: Property[] }>('/properties'),
        ApiClient.getInstance().get<{ data: Client[] }>('/clients'),
        ApiClient.getInstance().get<{ data: Agent[] }>('/agents')
      ]);

      setProperties(propertiesResponse.data || []);
      setClients(clientsResponse.data || []);
      setAgents(agentsResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.propertyId || !formData.clientId || !formData.agentId || !formData.scheduledDate || !formData.scheduledTime) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      setLoading(true);

      // Combine date and time
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      const inspectionData = {
        propertyId: formData.propertyId,
        clientId: formData.clientId,
        inspectorId: formData.agentId,
        inspectionType: formData.inspectionType,
        scheduledDate: scheduledDateTime.toISOString(),
        summary: formData.notes,
        status: 'scheduled'
      };

      if (editingInspection) {
        // Update existing inspection
        await ApiClient.getInstance().put(`/inspections/${editingInspection.id}`, inspectionData);
        Alert.alert('Success', 'Inspection updated successfully');
      } else {
        // Create new inspection
        await ApiClient.getInstance().post('/inspections', inspectionData);
        Alert.alert('Success', 'Inspection scheduled successfully');
      }

      onInspectionScheduled();
      onClose();
    } catch (error) {
      console.error('Error saving inspection:', error);
      Alert.alert('Error', 'Failed to save inspection');
    } finally {
      setLoading(false);
    }
  };

  const inspectionTypes = [
    { value: 'routine', label: 'Routine Inspection' },
    { value: 'move-in', label: 'Move-in Inspection' },
    { value: 'move-out', label: 'Move-out Inspection' },
    { value: 'maintenance', label: 'Maintenance Inspection' },
    { value: 'emergency', label: 'Emergency Inspection' }
  ];

  const renderPropertyItem = (property: Property) => {
    const displayName = property.name || property.address?.street || 'Property';
    const owner = property._user ? `${property._user.firstName} ${property._user.lastName}` : '';
    const database = property._database || '';

    return (
      <View key={property._id} style={styles.itemContainer}>
        <Text style={[styles.itemTitle, { color: colors.gray[900] }]}>{displayName}</Text>
        {owner && (
          <Text style={[styles.itemSubtitle, { color: colors.gray[600] }]}>
            Owner: {owner} ({database})
          </Text>
        )}
      </View>
    );
  };

  const renderClientItem = (client: Client) => {
    const database = client._database || '';
    return (
      <View key={client._id} style={styles.itemContainer}>
        <Text style={[styles.itemTitle, { color: colors.gray[900] }]}>
          {client.firstName} {client.lastName}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.gray[600] }]}>
          {client.email} ({database})
        </Text>
      </View>
    );
  };

  const renderAgentItem = (agent: Agent) => {
    const database = agent._database || '';
    const isCurrentUser = agent._isCurrentUser;
    return (
      <View key={agent._id} style={styles.itemContainer}>
        <Text style={[styles.itemTitle, { color: colors.gray[900] }]}>
          {agent.firstName} {agent.lastName} {isCurrentUser ? '(You)' : ''}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.gray[600] }]}>
          {agent.email} ({database})
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" id='m-0'>
      <View style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={[styles.header, { borderBottomColor: colors.gray[200] }]}>
          <Text style={[styles.title, { color: colors.gray[900] }]}>
            {editingInspection ? 'Edit Inspection' : 'Schedule Inspection'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.gray[600] }]}>Loading...</Text>
            </View>
          ) : (
            <>
              {/* Property Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Property *</Text>
                <ScrollView style={styles.optionsContainer} nestedScrollEnabled>
                  {properties.map(property => (
                    <TouchableOpacity
                      key={property._id}
                      style={[
                        styles.optionItem,
                        { borderColor: colors.gray[200] },
                        formData.propertyId === property._id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, propertyId: property._id }))}
                    >
                      {renderPropertyItem(property)}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {properties.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.gray[500] }]}>No properties available</Text>
                )}
              </View>

              {/* Client Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Client *</Text>
                <ScrollView style={styles.optionsContainer} nestedScrollEnabled>
                  {clients.map(client => (
                    <TouchableOpacity
                      key={client._id}
                      style={[
                        styles.optionItem,
                        { borderColor: colors.gray[200] },
                        formData.clientId === client._id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, clientId: client._id }))}
                    >
                      {renderClientItem(client)}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {clients.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.gray[500] }]}>No clients available</Text>
                )}
              </View>

              {/* Agent Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Agent *</Text>
                <ScrollView style={styles.optionsContainer} nestedScrollEnabled>
                  {agents.map(agent => (
                    <TouchableOpacity
                      key={agent._id}
                      style={[
                        styles.optionItem,
                        { borderColor: colors.gray[200] },
                        formData.agentId === agent._id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, agentId: agent._id }))}
                    >
                      {renderAgentItem(agent)}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {agents.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.gray[500] }]}>No agents available</Text>
                )}
              </View>

              {/* Inspection Type */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Inspection Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                  {inspectionTypes.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        { borderColor: colors.gray[200] },
                        formData.inspectionType === type.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, inspectionType: type.value }))}
                    >
                      <Text style={[
                        styles.typeText,
                        { color: colors.gray[600] },
                        formData.inspectionType === type.value && { color: colors.primary }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date and Time */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Date *</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.gray[200], color: colors.gray[900] }]}
                  value={formData.scheduledDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, scheduledDate: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.gray[500]}
                />
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Time *</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.gray[200], color: colors.gray[900] }]}
                  value={formData.scheduledTime}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, scheduledTime: text }))}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.gray[500]}
                />
              </View>

              {/* Notes */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Notes</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: colors.gray[200], color: colors.gray[900] }]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Additional notes..."
                  placeholderTextColor={colors.gray[500]}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.gray[200] }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.gray[300] }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.gray[600] }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.white }]}>
                {editingInspection ? 'Update' : 'Schedule'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    maxHeight: 200,
  },
  optionItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  typeContainer: {
    flexDirection: 'row',
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ScheduleInspectionModal;
