import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated, Dimensions, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';

import { useAuth } from '../hooks/useAuth';
import { useInspections } from '../hooks/useInspections';
import { useReports } from '../hooks/useReports';
import { useStats } from '../hooks/useStats';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import Input from '../components/Input';
import ViewInspectionModal from '../components/ViewInspectionModal';
import { Inspection } from '../types';
import { ApiClient } from '../config/api';
import { syncService } from '../services/syncService';
import { offlineApiService } from '../services/offlineApiService';
import LoadingScreen from '../components/LoadingScreen';

const { width, height } = Dimensions.get('window');

// Hovering Card Component
interface HoveringCardProps {
  children: React.ReactNode;
  style?: any;
  delay?: number;
}

const HoveringCard: React.FC<HoveringCardProps> = ({ children, style, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={{ flex: 1 }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const InspectionCard: React.FC<{ inspection: Inspection; onPress: () => void }> = ({ 
  inspection, 
  onPress 
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const scheduledDate = new Date(inspection.scheduledDate);
  const isToday = format(scheduledDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  
  const statusColors = {
    upcoming: { bg: colors.blue[100], text: colors.blue[700] },
    'in-progress': { bg: colors.yellow[100], text: colors.yellow[800] },
    completed: { bg: colors.green[100], text: colors.green[800] },
    cancelled: { bg: colors.red[100], text: colors.red[800] },
    scheduled: { bg: colors.blue[100], text: colors.blue[700] },
    pending: { bg: colors.gray[100], text: colors.gray[700] },
    overdue: { bg: colors.red[100], text: colors.red[800] }
  };
  
  const statusColor = statusColors[inspection.status] || { bg: colors.gray[100], text: colors.gray[700] };

  return (
    <HoveringCard style={[styles.card, { 
      backgroundColor: colors.white, 
      borderColor: colors.gray[200],
      borderWidth: 1,
      shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000'
    }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
        <View style={styles.cardHeader}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {inspection.status.replace('-', ' ')}
              </Text>
            </View>
            {isToday && (
              <View style={[styles.todayBadge, { backgroundColor: colors.red[100] }]}>
                <Text style={[styles.todayText, { color: colors.red[800] }]}>{t('dashboard.today')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Icon name="location-on" size={20} color={colors.icon} />
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: colors.gray[900] }]}>{inspection.property.address}</Text>
              <Text style={[styles.infoSubtitle, { color: colors.gray[600] }]}>
                {inspection.property.bedrooms && `${inspection.property.bedrooms} bed`}
                {inspection.property.bathrooms && ` • ${inspection.property.bathrooms} bath`}
                {inspection.property.area && ` • ${inspection.property.area} sq ft`}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="event" size={20} color={colors.icon} />
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: colors.gray[900] }]}>
                {format(scheduledDate, 'EEEE, MMMM d, yyyy')}
              </Text>
              <Text style={[styles.infoSubtitle, { color: colors.gray[600] }]}>
                {format(scheduledDate, 'h:mm a')}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="person" size={20} color={colors.icon} />
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: colors.gray[900] }]}>{inspection.client.name}</Text>
              <Text style={[styles.infoSubtitle, styles.capitalize, { color: colors.gray[600] }]}>
                {inspection.client.type}
              </Text>
            </View>
          </View>
        </View>

        {inspection.status === 'in-progress' && (
          <View style={[styles.cardFooter, { borderTopColor: colors.gray[100] }]}>
            <View style={styles.progressIndicator}>
              <Icon name="schedule" size={16} color={colors.icon} />
              <Text style={[styles.progressText, { color: colors.yellow[600] }]}>{t('dashboard.inProgress')}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </HoveringCard>
  );
};

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { inspections, loading, refreshInspections } = useInspections();
  const { reports, loading: reportsLoading, refreshReports } = useReports();
  const { userStats, isLoading: isStatsLoading, refreshStats } = useStats();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingInspection, setViewingInspection] = useState<any>(null);

  const formatPersonName = (name?: string) => {
    if (!name) return '';
    return name
      .trim()
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const filters = [
    { key: 'all', label: t('dashboard.all'), count: inspections.length },
    { key: 'upcoming', label: t('dashboard.upcoming'), count: inspections.filter(i => i.status === 'upcoming' || (i.status as any) === 'scheduled').length },
    { key: 'in-progress', label: t('dashboard.inProgress'), count: inspections.filter(i => i.status === 'in-progress').length },
    { key: 'completed', label: t('dashboard.completed'), count: inspections.filter(i => i.status === 'completed').length }
  ];

  const filteredInspections = inspections.filter((inspection: Inspection) => {
    const matchesFilter = activeFilter === 'all' || 
      inspection.status === activeFilter ||
      (activeFilter === 'upcoming' && (inspection.status === 'upcoming' || (inspection.status as any) === 'scheduled'));
    const matchesSearch = searchQuery === '' || 
      inspection.property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.client.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Dynamic Statistics
  const upcomingCount = inspections.filter(i => i.status === 'upcoming' || (i.status as any) === 'scheduled').length;
  
  // Reports Statistics
  const completedReports = reports.filter(r => r.status === 'Completed').length;
  // const draftReports = reports.filter(r => r.status === 'Draft').length;
  const pendingReports = reports.filter(r => r.status === 'Pending').length;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Try to sync data when refreshing
      const syncStatus = syncService.getSyncStatus();
      if (syncStatus.isOnline) {
        await syncService.syncAllData();
      }
      
      await Promise.all([refreshInspections(), refreshReports(), refreshStats()]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewInspection = async (inspection: Inspection) => {
    try {
      // Use offline-first approach to get inspection data
      const syncStatus = syncService.getSyncStatus();
      let fullInspection: any;
      
      if (syncStatus.isOnline) {
        try {
          // Try to get fresh data from server
          const response = await ApiClient.getInstance().get(`/inspections/${inspection.id}`);
          fullInspection = (response as any).data;
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
      const completeInspection = {
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
        _database: fullInspection._database,
        isCompleted: fullInspection.isCompleted || false,
        // Add client contact information
        clientEmail: fullInspection.client_email || fullInspection.clientId?.email || '',
        clientPhone: fullInspection.client_phone || fullInspection.clientId?.phone || '',
        clientAddress: fullInspection.client_address || fullInspection.clientId?.address || '',
        // Add property details
        propertyType: fullInspection.property_type || fullInspection.propertyId?.propertyType || '',
        propertySize: fullInspection.property_size || fullInspection.propertyId?.size || '',
        // Add agent details
        agentEmail: fullInspection.inspector_email || fullInspection.inspectorId?.email || '',
        agentPhone: fullInspection.inspector_phone || fullInspection.inspectorId?.phone || '',
        // Keep original data for filtering
        _originalInspectorId: fullInspection.inspectorId,
        _originalInspectorName: fullInspection.inspector_name
      };
      
      setViewingInspection(completeInspection);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error loading inspection details:', error);
    }
  };

  const renderInspection = ({ item }: { item: Inspection }) => (
    <InspectionCard
      inspection={item}
      onPress={() => handleViewInspection(item)}
    />
  );

  const renderFilter = ({ item }: { item: typeof filters[0] }) => (
    <HoveringCard style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          { 
            backgroundColor: colors.gray[100],
            borderColor: colors.gray[200],
            borderWidth: 1,
            shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000'
          },
          activeFilter === item.key && { 
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            shadowColor: colors.primary
          }
        ]}
        onPress={() => setActiveFilter(item.key)}
      >
        <Text style={[
          styles.filterText,
          { color: colors.gray[700] },
          activeFilter === item.key && { color: colors.white }
        ]}>
          {item.label}
        </Text>
        <View style={[
          styles.filterCount,
          { 
            backgroundColor: colors.white,
            borderColor: colors.gray[200],
            borderWidth: 1
          },
          activeFilter === item.key && { 
            backgroundColor: colors.blue[600],
            borderColor: colors.blue[600]
          }
        ]}>
          <Text style={[
            styles.filterCountText,
            { color: colors.gray[600] },
            activeFilter === item.key && { color: colors.white }
          ]}>
            {item.count}
          </Text>
        </View>
      </TouchableOpacity>
    </HoveringCard>
  );

  if (loading || reportsLoading || isStatsLoading) {
    return <LoadingScreen />;
  }

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
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.gray[900] }]}>{t('dashboard.goodMorning')}</Text>
            <Text style={[styles.userName, { color: colors.gray[600] }]}>{formatPersonName(user?.name)}</Text>
          </View>
          <View style={styles.headerActions}>
            {/* <TouchableOpacity style={[styles.notificationButton, {
              borderColor: colors.gray[200],
              borderWidth: 1,
              borderRadius: 8,
              backgroundColor: colors.gray[50]
            }]}>
              <Icon name="notifications" size={24} color={colors.icon} />
              {upcomingCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.notificationBadgeText, { color: colors.white }]}>{upcomingCount}</Text>
                </View>
              )}
            </TouchableOpacity> */}
            <TouchableOpacity style={[styles.profileButton, { 
              backgroundColor: colors.primary,
              borderColor: colors.primary,
              borderWidth: 2,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3
            }]} >
              <Text style={[styles.profileInitial, { color: colors.white }]}>{user?.name?.trim()?.charAt(0)?.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input
          placeholder={t('dashboard.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Enhanced Stats Section */}
        <View style={[styles.statsSection, {
          backgroundColor: colors.gray[50],
          borderColor: colors.gray[200],
          borderWidth: 1,
          borderRadius: 16,
          margin: 12,
          padding: 16
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>{t('dashboard.overview')}</Text>
          
          {/* Inspections Stats */}
          <View style={styles.statsRow}>
            <HoveringCard style={styles.statCardContainer}>
              <View style={[styles.statCard, { 
                backgroundColor: colors.white,
                borderColor: colors.gray[200],
                borderWidth: 1,
                shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000'
              }]}>
                <View style={styles.statContent}>
                  <Text style={[styles.statLabel, { color: colors.gray[600] }]}>{t('dashboard.today')}</Text>
                </View>
                <View style={styles.statBottomRow}>
                  <Text style={[styles.statValue, { color: colors.gray[900] }]}>{isStatsLoading ? '...' : userStats.todayCount}</Text>
                  <View style={[styles.statIcon, { backgroundColor: colors.primary }]}>
                    <Icon name="today" size={20} color={colors.white} />
                  </View>
                </View>
              </View>
            </HoveringCard>
            
            <HoveringCard style={styles.statCardContainer}>
              <View style={[styles.statCard, { 
                backgroundColor: colors.white,
                borderColor: colors.gray[200],
                borderWidth: 1,
                shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000'
              }]}>
                <View style={styles.statContent}>
                  <Text style={[styles.statLabel, { color: colors.gray[600] }]}>{t('dashboard.completed')}</Text>
                </View>
                <View style={styles.statBottomRow}>
                  <Text style={[styles.statValue, { color: colors.gray[900] }]}>{isStatsLoading ? '...' : userStats.completedCount}</Text>
                  <View style={[styles.statIcon, { backgroundColor: colors.success }]}>
                    <Icon name="check-circle" size={20} color={colors.white} />
                  </View>
                </View>
              </View>
            </HoveringCard>
          </View>

          {/* Reports Stats */}
          <View style={styles.statsRow}>
            <HoveringCard style={styles.statCardContainer}>
              <View style={[styles.statCard, { 
                backgroundColor: colors.white,
                borderColor: colors.gray[200],
                borderWidth: 1,
                shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000'
              }]}>
                <View style={styles.statContent}>
                  <Text style={[styles.statLabel, { color: colors.gray[600] }]}>{t('dashboard.totalReports')}</Text>
                </View>
                <View style={styles.statBottomRow}>
                  <Text style={[styles.statValue, { color: colors.gray[900] }]}>{isStatsLoading ? '...' : userStats.reports}</Text>
                  <View style={[styles.statIcon, { backgroundColor: colors.warning }]}>
                    <Icon name="description" size={20} color={colors.white} />
                  </View>
                </View>
              </View>
            </HoveringCard>
            
            {/* Empty space for future stat card */}
          </View>
        </View>

        {/* Recent Reports Section */}
        <View style={[styles.reportsSection, {
          backgroundColor: colors.gray[50],
          borderColor: colors.gray[200],
          borderWidth: 1,
          borderRadius: 16,
          margin: 12,
          padding: 16
        }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>{t('dashboard.recentReports')}</Text>
            <TouchableOpacity onPress={() => {/* Navigate to Reports tab */}}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('dashboard.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          
          {isStatsLoading ? (
            <View style={styles.reportsLoadingState}>
              <Text style={[styles.reportsLoadingText, { color: colors.gray[500] }]}>
                {t('common.loading')}...
              </Text>
            </View>
          ) : userStats.recentReports.length > 0 ? (
            <View style={styles.reportsList}>
              {userStats.recentReports.map((report, index) => (
                <HoveringCard key={report.id} style={styles.reportCardContainer}>
                  <View style={[styles.reportCard, { 
                    backgroundColor: colors.white,
                    borderColor: colors.gray[200],
                    borderWidth: 1,
                    shadowColor: colors.gray[900] === '#111827' ? 'rgba(255,255,255,0.1)' : '#000'
                  }]}>
                    <View style={styles.reportHeader}>
                      <Text style={[styles.reportTitle, { color: colors.gray[900] }]} numberOfLines={1}>
                        {report.title}
                      </Text>
                    </View>
                    <Text style={[styles.reportProperty, { color: colors.gray[600] }]} numberOfLines={1}>
                      {report.property}
                    </Text>
                    <Text style={[styles.reportDate, { color: colors.gray[500] }]}>
                      {report.date}
                    </Text>
                  </View>
                </HoveringCard>
              ))}
            </View>
          ) : (
            <View style={styles.reportsEmptyState}>
              <Icon name="description" size={48} color={colors.icon} />
              <Text style={[styles.reportsEmptyText, { color: colors.gray[500] }]}>
                {t('dashboard.noReports')}
              </Text>
              <Text style={[styles.reportsEmptySubtext, { color: colors.gray[400] }]}>
                {t('dashboard.noReportsMessage')}
              </Text>
            </View>
          )}
        </View>

        {/* Inspections List */}
        <View style={[styles.inspectionsSection, {
          backgroundColor: colors.gray[50],
          borderColor: colors.gray[200],
          borderWidth: 1,
          borderRadius: 16,
          margin: 12,
          padding: 16
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>{t('dashboard.filterInspections')}</Text>
          <FlatList
            data={filters}
            renderItem={renderFilter}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
            contentContainerStyle={styles.filtersContent}
          />
          <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>
            {/* {t('nav.schedules')} */}
            </Text>
          {filteredInspections.length > 0 ? (
            <View style={styles.inspectionsList}>
              {filteredInspections.map((inspection) => (
                <InspectionCard
                  key={inspection.id}
                  inspection={inspection}
                  onPress={() => handleViewInspection(inspection)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="assignment" size={64} color={colors.icon} />
              <Text style={[styles.emptyTitle, { color: colors.gray[500] }]}>
                {searchQuery ? t('dashboard.noInspectionsFound') : t('dashboard.noInspections')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.gray[400] }]}>
                {searchQuery 
                  ? t('dashboard.tryAdjustingSearch') 
                  : t('dashboard.noInspectionsMessage')
                }
              </Text>
              {!searchQuery && (
                <TouchableOpacity 
                  style={[styles.scheduleButton, { backgroundColor: colors.primary }]}
                  onPress={() => {/* Navigate to Schedules tab */}}
                >
                  <Icon name="add" size={20} color={colors.white} />
                  <Text style={[styles.scheduleButtonText, { color: colors.white }]}>
                    {t('dashboard.scheduleInspection')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* View Inspection Modal */}
      <ViewInspectionModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingInspection(null);
        }}
        inspection={viewingInspection}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchInput: {
    marginBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  // New Section Styles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Stats Section
  statsSection: {
    // paddingHorizontal: 12,
    // paddingVertical: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  statCardContainer: {
    flex: 1,
    minWidth: 140,
  },
  statCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 120,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statContent: {
    width: '100%',
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
    textAlign: 'left',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  // Reports Section
  reportsSection: {
    // paddingHorizontal: 12,
    // paddingVertical: 20,
  },
  reportsList: {
    gap: 12,
  },
  reportCardContainer: {
    marginBottom: 8,
  },
  reportCard: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  reportStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reportStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportProperty: {
    fontSize: 14,
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
  },
  // Filters Section
  filtersSection: {
    // paddingHorizontal: 12,
    // paddingVertical: 20,
  },
  filterContainer: {
    marginRight: 8,
  },
  filters: {
    marginBottom: 0,
  },
  filtersContent: {
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterCount: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Inspections Section
  inspectionsSection: {
    // paddingHorizontal: 12,
    // paddingVertical: 20,
    // paddingBottom: 100,
  },
  inspectionsList: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardContent: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportsEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  reportsEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  reportsEmptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  reportsLoadingState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  reportsLoadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DashboardScreen;