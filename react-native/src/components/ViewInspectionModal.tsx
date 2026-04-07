import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface ViewInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: any;
}

const ViewInspectionModal: React.FC<ViewInspectionModalProps> = ({
  isOpen,
  onClose,
  inspection
}) => {
  const { colors } = useTheme();

  if (!inspection) return null;

  const handleCallClient = () => {
    if (inspection.clientPhone) {
      Alert.alert(
        'Call Client',
        `Call ${inspection.client} at ${inspection.clientPhone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // You can implement actual calling functionality here
            Alert.alert('Calling', `Calling ${inspection.clientPhone}...`);
          }}
        ]
      );
    } else {
      Alert.alert('No Phone Number', 'Client phone number not available');
    }
  };

  const handleEmailClient = () => {
    if (inspection.clientEmail) {
      Alert.alert(
        'Email Client',
        `Send email to ${inspection.client} at ${inspection.clientEmail}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Email', onPress: () => {
            // You can implement actual email functionality here
            Alert.alert('Emailing', `Opening email to ${inspection.clientEmail}...`);
          }}
        ]
      );
    } else {
      Alert.alert('No Email', 'Client email not available');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: '#D1FAE5', text: '#065F46' };
      case 'scheduled': return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'in-progress': return { bg: '#FEF3C7', text: '#92400E' };
      case 'pending': return { bg: '#F3F4F6', text: '#374151' };
      case 'overdue': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'cancelled': return { bg: '#F3F4F6', text: '#6B7280' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const statusColors = getStatusColor(inspection.status);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      id='m-0'
    >
      <View style={[styles.container, { backgroundColor: colors.gray[50] }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.gray[200] }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.gray[900] }]}>Inspection Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Badge */}
          <View style={styles.section}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {inspection.status?.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Basic Information */}
          <View style={[styles.section, { backgroundColor: colors.white }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Basic Information</Text>
            
            <View style={styles.infoRow}>
              <Icon name="event" size={20} color={colors.gray[500]} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Date & Time</Text>
                <Text style={[styles.infoValue, { color: colors.gray[900] }]}>
                  {inspection.date?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} at {inspection.time}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="category" size={20} color={colors.gray[500]} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Type</Text>
                <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.type}</Text>
              </View>
            </View>

            {inspection.notes && (
              <View style={styles.infoRow}>
                <Icon name="notes" size={20} color={colors.gray[500]} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Notes</Text>
                  <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.notes}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Property Information */}
          <View style={[styles.section, { backgroundColor: colors.white }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Property</Text>
            
            <View style={styles.infoRow}>
              <Icon name="home" size={20} color={colors.gray[500]} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Address</Text>
                <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.property}</Text>
              </View>
            </View>

            {inspection.propertyType && (
              <View style={styles.infoRow}>
                <Icon name="category" size={20} color={colors.gray[500]} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Type</Text>
                  <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.propertyType}</Text>
                </View>
              </View>
            )}

            {inspection.propertySize && (
              <View style={styles.infoRow}>
                <Icon name="straighten" size={20} color={colors.gray[500]} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Size</Text>
                  <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.propertySize}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Client Information */}
          <View style={[styles.section, { backgroundColor: colors.white }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Client</Text>
            
            <View style={styles.infoRow}>
              <Icon name="person" size={20} color={colors.gray[500]} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Name</Text>
                <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.client}</Text>
              </View>
            </View>

            {inspection.clientEmail && (
              <View style={styles.infoRow}>
                <Icon name="email" size={20} color={colors.gray[500]} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.clientEmail}</Text>
                </View>
              </View>
            )}

            {inspection.clientPhone && (
              <View style={styles.infoRow}>
                <Icon name="phone" size={20} color={colors.gray[500]} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.clientPhone}</Text>
                </View>
              </View>
            )}

            {inspection.clientAddress && (
              <View style={styles.infoRow}>
                <Icon name="location-on" size={20} color={colors.gray[500]} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Address</Text>
                  <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.clientAddress}</Text>
                </View>
              </View>
            )}

            {/* Contact Actions */}
            <View style={styles.contactActions}>
              {inspection.clientPhone && (
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: colors.green[100] }]}
                  onPress={handleCallClient}
                >
                  <Icon name="phone" size={20} color={colors.green[600]} />
                  <Text style={[styles.contactButtonText, { color: colors.green[600] }]}>Call</Text>
                </TouchableOpacity>
              )}

              {inspection.clientEmail && (
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: colors.blue[100] }]}
                  onPress={handleEmailClient}
                >
                  <Icon name="email" size={20} color={colors.blue[600]} />
                  <Text style={[styles.contactButtonText, { color: colors.blue[600] }]}>Email</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Agent Information */}
          <View style={[styles.section, { backgroundColor: colors.white }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>Inspector</Text>
            
            <View style={styles.infoRow}>
              <Icon name="person-pin" size={20} color={colors.gray[500]} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Name</Text>
                <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.agent}</Text>
              </View>
            </View>

            {inspection.agentEmail && (
              <View style={styles.infoRow}>
                <Icon name="email" size={20} color={colors.gray[500]} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.agentEmail}</Text>
                </View>
              </View>
            )}

            {inspection.agentPhone && (
              <View style={styles.infoRow}>
                <Icon name="phone" size={20} color={colors.gray[500]} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.gray[600] }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: colors.gray[900] }]}>{inspection.agentPhone}</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ViewInspectionModal;
