import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal, 
  TextInput,
  FlatList,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import ApiClient from '../config/api';
import ScheduleInspectionModal from '../components/ScheduleInspectionModal';
import ViewInspectionModal from '../components/ViewInspectionModal';
import InspectionCompletionModal from '../components/InspectionCompletionModal';
import StyledPopup from '../components/StyledPopup';
import { syncService } from '../services/syncService';
import { offlineApiService } from '../services/offlineApiService';
import OfflineIndicator from '../components/OfflineIndicator';
import LoadingScreen from '../components/LoadingScreen';

const { width } = Dimensions.get('window');

interface InspectionDisplay {
  id: string;
  date: Date;
  time: string;
  property: string;
  client: string;
  agent: string;
  type: string;
  status: string;
  clientId?: string;
  agentId?: string;
  propertyId?: string;
  notes?: string;
  _database?: string;
  isCompleted?: boolean;
  // Client contact information
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  // Property details
  propertyType?: string;
  propertySize?: string;
  // Agent details
  agentEmail?: string;
  agentPhone?: string;
}

const statusColors = {
  completed: { bg: '#D1FAE5', text: '#065F46' },
  scheduled: { bg: '#F3E8FF', text: '#8B2138' },
  'in-progress': { bg: '#FEF3C7', text: '#92400E' },
  pending: { bg: '#F3F4F6', text: '#374151' },
  overdue: { bg: '#FEE2E2', text: '#DC2626' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' }
};

const SchedulesScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inspections, setInspections] = useState<InspectionDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<InspectionDisplay | null>(null);
  const [viewingInspection, setViewingInspection] = useState<any>(null);
  const [completingInspection, setCompletingInspection] = useState<InspectionDisplay | null>(null);

  // Success popup for inspection completion
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupData, setSuccessPopupData] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      setLoading(true);
      console.log('=== LOADING INSPECTIONS ===');
      console.log('Current user:', user);
      
      // Use offline-first approach
      const syncStatus = syncService.getSyncStatus();
      let rawData: any[] = [];
      
      if (syncStatus.isOnline) {
        try {
          // Try to sync and get fresh data from server
          await syncService.syncTable('inspections');
          // Force a fresh request by adding a timestamp parameter
          const response = await ApiClient.getInstance().get<{ data: any[] }>('/inspections');
          rawData = response.data || [];
        } catch (syncError) {
          console.log('Sync failed, using local data:', syncError);
          // Fallback to local data
          const localResponse = await offlineApiService.findAll('inspections');
          rawData = localResponse.data || [];
        }
      } else {
        // Use local data when offline
        const localResponse = await offlineApiService.findAll('inspections');
        rawData = localResponse.data || [];
      }
      console.log('Raw inspections data received:', rawData.length, 'inspections');
      console.log('Sample inspection data:', rawData[0]);
      
      // Transform the data to match the expected format
      const transformedInspections = rawData.map((inspection: any) => {
        // Use the stored names directly (new inspections) or fallback to ID-based lookup (old inspections)
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
        
        console.log('Agent name resolution:', {
          inspector_name: inspection.inspector_name,
          inspectorId: inspection.inspectorId,
          resolvedName: agentName
        });

        return {
          id: inspection._id,
          date: new Date(inspection.scheduledDate),
          time: new Date(inspection.scheduledDate).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          property: propertyDisplay,
          client: clientName,
          agent: agentName,
          type: inspection.inspectionType || 'Inspection',
          status: inspection.status || 'scheduled',
          clientId: inspection.clientId?._id || inspection.clientId || '',
          agentId: inspection.inspectorId?._id || inspection.inspectorId || '',
          propertyId: inspection.propertyId?._id || inspection.propertyId || '',
          notes: inspection.summary || inspection.notes || '',
          _database: inspection._database,
          isCompleted: inspection.isCompleted || false,
          // Add client contact information (use stored fields first, then fallback to ID-based lookup)
          clientEmail: inspection.client_email || inspection.clientId?.email || '',
          clientPhone: inspection.client_phone || inspection.clientId?.phone || '',
          clientAddress: inspection.client_address || inspection.clientId?.address || '',
          // Add property details (use stored fields first, then fallback to ID-based lookup)
          propertyType: inspection.property_type || inspection.propertyId?.propertyType || '',
          propertySize: inspection.property_size || inspection.propertyId?.size || '',
          // Add agent details (use stored fields first, then fallback to ID-based lookup)
          agentEmail: inspection.inspector_email || inspection.inspectorId?.email || '',
          agentPhone: inspection.inspector_phone || inspection.inspectorId?.phone || '',
          // Keep original data for filtering
          _originalInspectorId: inspection.inspectorId,
          _originalInspectorName: inspection.inspector_name
        };
      });
      
      // Filter inspections to show only those assigned to the current user and not completed
      const userInspections = transformedInspections.filter(inspection => {
        if (!user) return false;
        
        // Don't show completed inspections
        if (inspection.isCompleted || inspection.status === 'completed') {
          return false;
        }
        
        // Check if this inspection is assigned to the current user
        const isAssignedToUser = 
          // Check by inspector ID
          (inspection._originalInspectorId === user.id || 
           inspection._originalInspectorId === user.id?.toString()) ||
          // Check by inspector name
          (inspection._originalInspectorName === user.name) ||
          (inspection._originalInspectorName === user.email) ||
          (inspection._originalInspectorName === user.databaseName) ||
          (inspection._originalInspectorName === user.username);
        
        console.log(`Inspection ${inspection.id} assigned to user:`, isAssignedToUser, {
          inspectorId: inspection._originalInspectorId,
          inspectorName: inspection._originalInspectorName,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          isCompleted: inspection.isCompleted,
          status: inspection.status
        });
        
        return isAssignedToUser;
      });
      
      console.log(`Filtered ${userInspections.length} inspections for current user out of ${transformedInspections.length} total`);
      setInspections(userInspections);
    } catch (error) {
      console.error('Error loading inspections:', error);
      Alert.alert(t('common.error'), t('schedules.failedToLoad'));
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle inspection completion success
  const handleInspectionCompleted = async () => {
    try {
      // Reload inspections to show the updated status
      await loadInspections();
      
      // Show success popup
      setSuccessPopupData({
        title: 'Inspection Completed',
        message: 'Your inspection has been completed and a report has been automatically generated.',
        type: 'success'
      });
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Error handling inspection completion:', error);
      // Show error popup if something went wrong
      setSuccessPopupData({
        title: 'Error',
        message: 'Failed to refresh inspections list. Please check manually.',
        type: 'error'
      });
      setShowSuccessPopup(true);
    }
  };

  // Helper function to determine if an inspection is overdue
  const isInspectionOverdue = (inspection: InspectionDisplay) => {
    const inspectionDate = inspection.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if the inspection date is in the past and status is not completed
    return inspectionDate < today && inspection.status !== 'completed';
  };

  // Helper function to get the effective status (including overdue)
  const getEffectiveStatus = (inspection: InspectionDisplay) => {
    if (isInspectionOverdue(inspection)) {
      return 'overdue';
    }
    return inspection.status;
  };

  // Helper function to check if inspection can be marked as completed
  const canMarkAsCompleted = (inspection: InspectionDisplay) => {
    // Can't mark as completed if already completed
    if (inspection.isCompleted || inspection.status === 'completed') {
      return false;
    }
    
    // Can't mark as completed if cancelled
    if (inspection.status === 'cancelled') {
      return false;
    }
    
    // Can mark as completed if the scheduled date has been reached or is overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledDate = new Date(inspection.date);
    scheduledDate.setHours(0, 0, 0, 0);
    
    return scheduledDate <= today;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getInspectionsForDate = (date: Date) => {
    return inspections.filter(inspection => {
      const inspectionDate = inspection.date;
      return inspectionDate.getDate() === date.getDate() &&
             inspectionDate.getMonth() === date.getMonth() &&
             inspectionDate.getFullYear() === date.getFullYear();
    });
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const selectedDateInspections = getInspectionsForDate(selectedDate);

  const handleViewInspection = async (inspection: InspectionDisplay) => {
    try {
      // Use offline-first approach to get inspection data
      const syncStatus = syncService.getSyncStatus();
      let fullInspection: any;
      
      if (syncStatus.isOnline) {
        try {
          // Try to get fresh data from server
          const response = await ApiClient.getInstance().get(`/inspections/${inspection.id}`) as any;
          fullInspection = response.data;
        } catch (error) {
          console.log('Failed to fetch from server, using local data:', error);
          // Fallback to local data
          const localResponse = await offlineApiService.findById('inspections', inspection.id);
          fullInspection = localResponse.data;
        }
      } else {
        // Use local data when offline
        const localResponse = await offlineApiService.findById('inspections', inspection.id);
        fullInspection = localResponse.data;
      }
      
      console.log('Full inspection data for viewing:', fullInspection);
      
      // Use the stored names directly (new inspections) or fallback to ID-based lookup (old inspections)
      const propertyDisplay = fullInspection.property_name || 
        (fullInspection.propertyId?.address?.street) || 
        (fullInspection.propertyId?.name) ||
        (typeof fullInspection.propertyId === 'string' ? `Property ID: ${fullInspection.propertyId}` : 'Property Address');
      
      const clientName = fullInspection.client_name || 
        (fullInspection.clientId?.firstName && fullInspection.clientId?.lastName ? `${fullInspection.clientId.firstName} ${fullInspection.clientId.lastName}` : '') ||
        (typeof fullInspection.clientId === 'string' ? `Client ID: ${fullInspection.clientId}` : 'Client Name');
      
      const agentName = fullInspection.inspector_name || 
        (fullInspection.inspectorId?.firstName && fullInspection.inspectorId?.lastName ? `${fullInspection.inspectorId.firstName} ${fullInspection.inspectorId.lastName}` : '') ||
        (typeof fullInspection.inspectorId === 'string' ? `Agent ID: ${fullInspection.inspectorId}` : 'Agent Name');

      // Create a complete inspection object for viewing
      const viewingData = {
        id: fullInspection._id,
        date: new Date(fullInspection.scheduledDate),
        time: new Date(fullInspection.scheduledDate).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        property: propertyDisplay,
        client: clientName,
        agent: agentName,
        type: fullInspection.inspectionType || 'Inspection',
        status: fullInspection.status || 'scheduled',
        clientId: fullInspection.clientId?._id || fullInspection.clientId || '',
        agentId: fullInspection.inspectorId?._id || fullInspection.inspectorId || '',
        propertyId: fullInspection.propertyId?._id || fullInspection.propertyId || '',
        notes: fullInspection.summary || fullInspection.notes || '',
        // Add client contact information (use stored fields first, then fallback to ID-based lookup)
        clientEmail: fullInspection.client_email || fullInspection.clientId?.email || '',
        clientPhone: fullInspection.client_phone || fullInspection.clientId?.phone || '',
        clientAddress: fullInspection.client_address || fullInspection.clientId?.address || '',
        // Add property details (use stored fields first, then fallback to ID-based lookup)
        propertyAddress: fullInspection.propertyId?.address || '',
        propertyType: fullInspection.property_type || fullInspection.propertyId?.propertyType || '',
        propertySize: fullInspection.property_size || fullInspection.propertyId?.size || '',
        // Add agent details (use stored fields first, then fallback to ID-based lookup)
        agentEmail: fullInspection.inspector_email || fullInspection.inspectorId?.email || '',
        agentPhone: fullInspection.inspector_phone || fullInspection.inspectorId?.phone || '',
        // Add database info
        database: fullInspection._database || ''
      };
      
      setViewingInspection(viewingData);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error loading inspection details:', error);
      Alert.alert(t('common.error'), t('schedules.failedToLoadDetails'));
    }
  };

  const handleDeleteInspection = async (inspection: InspectionDisplay) => {
    Alert.alert(
      t('schedules.cancelInspection'),
      t('schedules.cancelInspectionMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiClient.getInstance().delete(`/inspections/${inspection.id}`);
              Alert.alert(t('common.success'), t('schedules.inspectionCancelled'));
              loadInspections();
            } catch (error) {
              console.error('Error cancelling inspection:', error);
              Alert.alert(t('common.error'), t('schedules.failedToCancel'));
            }
          }
        }
      ]
    );
  };

  const handleMarkCompleted = async (inspection: InspectionDisplay) => {
    setCompletingInspection(inspection);
    setShowCompletionModal(true);
  };

  const renderCalendarDay = (day: Date | null, index: number) => {
    if (!day) {
      return <View key={index} style={styles.calendarDay} />;
    }

    const dayInspections = getInspectionsForDate(day);
    const isSelected = day.getDate() === selectedDate.getDate() &&
                      day.getMonth() === selectedDate.getMonth() &&
                      day.getFullYear() === selectedDate.getFullYear();
    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
    const hasOverdueInspections = dayInspections.some(inspection => isInspectionOverdue(inspection));

    return (
      <TouchableOpacity
        key={day.toISOString()}
        style={[
          styles.calendarDay,
          isSelected && [styles.selectedDay, { backgroundColor: colors.primary }],
          !isCurrentMonth && styles.otherMonthDay
        ]}
        onPress={() => setSelectedDate(day)}
      >
        <Text style={[
          styles.dayText,
          { color: isSelected ? colors.white : colors.gray[900] },
          isSelected && styles.selectedDayText,
          !isCurrentMonth && styles.otherMonthText
        ]}>
          {day.getDate()}
        </Text>
        {dayInspections.length > 0 && (
          <View style={[
            styles.inspectionDot,
            isSelected && styles.selectedInspectionDot,
            hasOverdueInspections && styles.overdueInspectionDot
          ]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderInspectionItem = ({ item }: { item: InspectionDisplay }) => {
    const effectiveStatus = getEffectiveStatus(item);
    const isOverdue = isInspectionOverdue(item);

    return (
      <View style={[styles.inspectionCard, {
        backgroundColor: colors.gray[50],
        borderColor: colors.gray[200],
        borderWidth: 1,
        shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }, isOverdue && styles.overdueCard]}>
        <View style={styles.inspectionHeader}>
          <View style={styles.inspectionTypeContainer}>
            <Text style={[styles.inspectionType, { color: colors.primary }]}>{item.type}</Text>
            {isOverdue && <Icon name="warning" size={16} color={colors.red[600]} />}
          </View>
          <View style={styles.timeContainer}>
            <Icon name="access-time" size={16} color={colors.gray[500]} />
            <Text style={[styles.timeText, { color: colors.gray[600] }]}>{item.time}</Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusColors[effectiveStatus as keyof typeof statusColors]?.bg }
          ]}>
            <Text style={[
              styles.statusText,
              { color: statusColors[effectiveStatus as keyof typeof statusColors]?.text }
            ]}>
              {t(`schedules.${effectiveStatus.replace('-', '')}`)}
            </Text>
          </View>
        </View>

        <View style={styles.inspectionDetails}>
          <View style={styles.detailRow}>
            <Icon name="home" size={16} color={colors.gray[500]} />
            <Text style={[styles.detailText, { color: colors.gray[700] }]}>{item.property}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="person" size={16} color={colors.gray[500]} />
            <Text style={[styles.detailText, { color: colors.gray[700] }]}>{t('schedules.client')}: {item.client}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="person-pin" size={16} color={colors.gray[500]} />
            <Text style={[styles.detailText, { color: colors.gray[700] }]}>{t('schedules.agent')}: {item.agent}</Text>
          </View>
        </View>

        <View style={styles.inspectionActions}>
          <TouchableOpacity
            style={[styles.actionButton, { 
              backgroundColor: colors.blue[50],
              borderColor: colors.blue[100],
              borderWidth: 1,
              shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2
            }]}
            onPress={() => handleViewInspection(item)}
          >
            <Icon name="visibility" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t('common.view')}</Text>
          </TouchableOpacity>
          
          {canMarkAsCompleted(item) && (
            <TouchableOpacity
              style={[styles.actionButton, { 
                backgroundColor: colors.green[50],
                borderColor: colors.green[100],
                borderWidth: 1,
                shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }]}
              onPress={() => handleMarkCompleted(item)}
            >
              <Icon name="check-circle" size={16} color={colors.green[600]} />
              <Text style={[styles.actionText, { color: colors.green[600] }]}>
                {t('common.complete')}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { 
              backgroundColor: colors.red[50],
              borderColor: colors.red[100],
              borderWidth: 1,
              shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2
            }]}
            onPress={() => handleDeleteInspection(item)}
          >
            <Icon name="delete" size={16} color={colors.red[600]} />
            <Text style={[styles.actionText, { color: colors.red[600] }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="event" size={64} color={colors.gray[400]} />
      <Text style={[styles.emptyMessage, { color: colors.gray[500] }]}>
        {t('schedules.noInspections')}
      </Text>
      <Text style={[styles.emptySubMessage, { color: colors.gray[400] }]}>
        {t('schedules.noInspectionsMessage')}
      </Text>
    </View>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    t('calendar.january'), t('calendar.february'), t('calendar.march'), t('calendar.april'), 
    t('calendar.may'), t('calendar.june'), t('calendar.july'), t('calendar.august'), 
    t('calendar.september'), t('calendar.october'), t('calendar.november'), t('calendar.december')
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.gray[50] }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: colors.white, 
        borderBottomColor: colors.gray[200],
        borderBottomWidth: 1,
        shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
      }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.title, { color: colors.gray[900] }]}>{t('schedules.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.gray[600] }]}>{t('schedules.subtitle')}</Text>
          </View>
          <OfflineIndicator />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Calendar */}
        <View style={[styles.calendarContainer, { 
          backgroundColor: colors.white,
          borderColor: colors.gray[200],
          borderWidth: 1,
          shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000'
        }]}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={prevMonth} style={[styles.navButton, {
              backgroundColor: colors.gray[100],
              borderColor: colors.gray[200],
              borderWidth: 1,
              borderRadius: 8
            }]}>
              <Icon name="chevron-left" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.gray[900] }]}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={[styles.navButton, {
              backgroundColor: colors.gray[100],
              borderColor: colors.gray[200],
              borderWidth: 1,
              borderRadius: 8
            }]}>
              <Icon name="chevron-right" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {/* Day headers */}
            {[
              t('calendar.sunday'), t('calendar.monday'), t('calendar.tuesday'), 
              t('calendar.wednesday'), t('calendar.thursday'), t('calendar.friday'), t('calendar.saturday')
            ].map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={[styles.dayHeaderText, { color: colors.gray[600] }]}>{day}</Text>
              </View>
            ))}
            
            {/* Calendar days */}
            {days.map((day, index) => renderCalendarDay(day, index))}
          </View>
        </View>

        {/* Selected Date Inspections */}
        <View style={[styles.inspectionsContainer, { 
          backgroundColor: colors.white,
          borderColor: colors.gray[200],
          borderWidth: 1,
          shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000'
        }]}>
          <View style={styles.inspectionsHeader}>
            <Text style={[styles.inspectionsTitle, { color: colors.gray[900] }]}>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            <Icon name="event" size={20} color={colors.gray[400]} />
          </View>

          {selectedDateInspections.length > 0 ? (
            <FlatList
              data={selectedDateInspections}
              renderItem={renderInspectionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>


      {/* Schedule Inspection Modal */}
      <ScheduleInspectionModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setEditingInspection(null);
        }}
        onInspectionScheduled={loadInspections}
        editingInspection={editingInspection}
      />

      {/* View Inspection Modal */}
      <ViewInspectionModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingInspection(null);
        }}
        inspection={viewingInspection}
      />

      {/* Inspection Completion Modal */}
      <InspectionCompletionModal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setCompletingInspection(null);
        }}
        onInspectionCompleted={handleInspectionCompleted}
        inspection={completingInspection}
      />

      {/* Styled Success Popup for Inspection Completion */}
      <StyledPopup
        isVisible={showSuccessPopup}
        onClose={() => {
          setShowSuccessPopup(false);
          setSuccessPopupData(null);
        }}
        title={successPopupData?.title || ''}
        message={successPopupData?.message || ''}
        type={successPopupData?.type || 'success'}
        duration={1000} // Auto-close after 1 second
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // backgroundColor: 'yellow',
  },
  selectedDay: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 16,
    height: 45,
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
    lineHeight: 45,
    textAlignVertical: 'center',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    textAlign: 'center',
    width: '100%',
    lineHeight: 45,
    textAlignVertical: 'center',
  },
  otherMonthText: {
    opacity: 0.4,
  },
  inspectionDot: {
    position: 'absolute',
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B2138',
  },
  selectedInspectionDot: {
    backgroundColor: '#FFFFFF',
  },
  overdueInspectionDot: {
    backgroundColor: '#EF4444',
  },
  inspectionsContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inspectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inspectionsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  inspectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overdueCard: {
    borderColor: '#FECACA',
    shadowColor: '#FEE2E2',
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspectionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inspectionType: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  statusContainer: {
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inspectionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  inspectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessage: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubMessage: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default SchedulesScreen;
