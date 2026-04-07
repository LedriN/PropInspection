import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import ApiClient from '../config/api';
import GenerateReportModal from '../components/GenerateReportModal';
import ConfirmationModal from '../components/ConfirmationModal';
import EmailConfirmationModal from '../components/EmailConfirmationModal';
import StyledPopup from '../components/StyledPopup';
import { syncService } from '../services/syncService';
import { offlineApiService } from '../services/offlineApiService';
import { simpleSyncService } from '../services/simpleSyncService';
import OfflineIndicator from '../components/OfflineIndicator';
import LoadingScreen from '../components/LoadingScreen';
import { colors as baseColors } from '../styles/colors';
import { database } from '../database';
import { formatAddress } from '../utils/addressUtils';

const { width } = Dimensions.get('window');

// Hovering Card Component
interface HoveringCardProps {
  children: React.ReactNode;
  style?: any;
  delay?: number;
}

const HoveringCard: React.FC<HoveringCardProps> = ({ children, style, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 400,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
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

interface ReportDisplay {
  id: string;
  title: string;
  property: string;
  client: string;
  agent: string;
  type: string;
  date: string;
  status: string;
  isSynced?: boolean;
}


const statusColors = {
  Completed: { bg: '#D1FAE5', text: '#065F46' },
  Draft: { bg: '#FEF3C7', text: '#92400E' },
  Pending: { bg: '#F3E8FF', text: '#8B2138' },
  Sent: { bg: '#F3E8FF', text: '#8B2138' },
};

// Image component with error handling
interface ImageWithFallbackProps {
  uri: string;
  style: any;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ uri, style }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
 
  const handleError = () => {
    console.error('Image failed to load:', uri);
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    console.log('Image loaded successfully:', uri);
    setIsLoading(false);
    setHasError(false);
  };

  if (hasError) {
    return (
      <View style={[style, { backgroundColor: colors.gray[100], justifyContent: 'center', alignItems: 'center' }]}>
        <Icon name="broken-image" size={20} color={colors.gray[400]} />
        <Text style={{ fontSize: 8, color: colors.gray[500], textAlign: 'center', marginTop: 2 }}>
          {t('reports.loadFailed')}
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <Image 
        source={{ uri }} 
        style={style}
        onError={handleError}
        onLoad={handleLoad}
      />
      {isLoading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.1)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ActivityIndicator size="small" color={colors.gray[500]} />
        </View>
      )}
    </View>
  );
};

const ReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('inspection');
  const [reports, setReports] = useState<ReportDisplay[]>([]);
  const [rawReports, setRawReports] = useState<any[]>([]);
  const [selectedRawReport, setSelectedRawReport] = useState<any | null>(null);
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalData, setEmailModalData] = useState<{
    reportId: string;
    reportTitle: string;
    agentEmail: string;
    clientEmail: string;
  } | null>(null);

  // Success popup for report generation
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupData, setSuccessPopupData] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Success popup for email sending
  const [showEmailSuccessPopup, setShowEmailSuccessPopup] = useState(false);
  const [emailSuccessPopupData, setEmailSuccessPopupData] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);



  // Helpers: translate inspection areas/fields/values
  const getAreaTitle = (areaKey: string) => {
    const areaKeyMap: Record<string, string> = {
      exterior: 'inspection.exterior',
      interior: 'inspection.interior',
      electrical: 'inspection.electrical',
      plumbing: 'inspection.plumbing',
      hvac: 'inspection.hvac',
      safety: 'inspection.safety',
    };
    return t(areaKeyMap[areaKey] || areaKey);
  };

  const getFieldLabel = (fieldKey: string) => {
    const fieldMap: Record<string, string> = {
      // Condition fields
      roof_condition: 'inspection.roofCondition',
      siding_condition: 'inspection.sidingCondition',
      windows_doors: 'inspection.windowsDoors',
      foundation: 'inspection.foundation',
      exterior_notes: 'inspection.exteriorNotes',
      walls_condition: 'inspection.wallsCondition',
      floors_condition: 'inspection.floorsCondition',
      ceilings_condition: 'inspection.ceilingsCondition',
      interior_notes: 'inspection.interiorNotes',
      electrical_system: 'inspection.electricalSystem',
      outlets_switches: 'inspection.outletsSwitches',
      lighting: 'inspection.lighting',
      electrical_notes: 'inspection.electricalNotes',
      water_supply: 'inspection.waterSupply',
      drainage: 'inspection.drainage',
      fixtures: 'inspection.fixtures',
      plumbing_notes: 'inspection.plumbingNotes',
      heating_system: 'inspection.heatingSystem',
      cooling_system: 'inspection.coolingSystem',
      ventilation: 'inspection.ventilation',
      hvac_notes: 'inspection.hvacNotes',
      smoke_detectors: 'inspection.smokeDetectors',
      carbon_monoxide: 'inspection.carbonMonoxide',
      fire_extinguisher: 'inspection.fireExtinguisher',
      safety_notes: 'inspection.safetyNotes',
      // Image fields
      roof_images: 'inspection.roofImages',
      siding_images: 'inspection.sidingImages',
      windows_images: 'inspection.windowsImages',
      foundation_images: 'inspection.foundationImages',
      walls_images: 'inspection.wallsImages',
      floors_images: 'inspection.floorsImages',
      ceilings_images: 'inspection.ceilingsImages',
      electrical_system_images: 'inspection.electricalSystemImages',
      outlets_images: 'inspection.outletsImages',
      lighting_images: 'inspection.lightingImages',
      water_supply_images: 'inspection.waterSupplyImages',
      drainage_images: 'inspection.drainageImages',
      fixtures_images: 'inspection.fixturesImages',
      heating_system_images: 'inspection.heatingSystemImages',
      cooling_system_images: 'inspection.coolingSystemImages',
      ventilation_images: 'inspection.ventilationImages',
      smoke_detectors_images: 'inspection.smokeDetectorsImages',
      carbon_monoxide_images: 'inspection.carbonMonoxideImages',
      fire_extinguisher_images: 'inspection.fireExtinguisherImages',
    };
    if (fieldMap[fieldKey]) return t(fieldMap[fieldKey]);
    // Fallback to humanized label
    return fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const translateOptionValue = (value: any) => {
    if (typeof value !== 'string') return String(value);
    const normalized = value.trim().toLowerCase();
    const optionMap: Record<string, string> = {
      'excellent': 'inspection.excellent',
      'good': 'inspection.good',
      'fair': 'inspection.fair',
      'poor': 'inspection.poor',
      'needs replacement': 'inspection.needsReplacement',
      'needs repair': 'inspection.needsRepair',
      'needs upgrade': 'inspection.needsUpgrade',
      'present & working': 'inspection.presentWorking',
      'present - needs battery': 'inspection.presentNeedsBattery',
      'missing': 'inspection.missing',
      'not tested': 'inspection.notTested',
      'present & current': 'inspection.presentCurrent',
      'present - expired': 'inspection.presentExpired',
    };
    return t(optionMap[normalized] || value);
  };

  useEffect(() => {
    // Debug authentication and API setup
    console.log('ReportsScreen mounted');
    console.log('Current user:', user);
    console.log('User ID (agent_id):', user?.id);
    console.log('API Client token:', ApiClient.getInstance().getToken());

    ApiClient.getInstance().testConnection().then(isConnected => {
      console.log('API Connection test:', isConnected);
    });

    loadReports();
    
    // Start auto-sync with shorter interval for more frequent deletion checks
    simpleSyncService.startAutoSync(15000); // Check every 15 seconds
    
    // Cleanup on unmount
    return () => {
      simpleSyncService.stopAutoSync();
    };
  }, [user]);

  // Refresh reports when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('ReportsScreen focused, refreshing reports...');
      loadReports();
    }, [])
  );

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading reports from simple database...');
      
      // First, check for deleted reports if online
      const syncStatus = syncService.getSyncStatus();
      if (syncStatus.isOnline) {
        try {
          console.log('Checking for deleted reports...');
          await simpleSyncService.checkForDeletedReportsManually();
        } catch (error) {
          console.log('Error checking for deleted reports:', error);
          // Continue with loading even if deletion check fails
        }
      }
      
      // Get reports from our simple database
      console.log('=== DATABASE DEBUG ===');
      console.log('Raw database reports:', database.reports);
      console.log('Database reports length:', database.reports.length);
      
      const localReports = database.reports.map((report: any) => {
        console.log('Processing report:', report.id, 'Title:', report.title);
        console.log('Report content type:', typeof report.content);
        console.log('Report content preview:', typeof report.content === 'string' ? report.content.substring(0, 100) + '...' : report.content);
        
        // Parse content if it's a JSON string
        if (typeof report.content === 'string') {
          try {
            report.content = JSON.parse(report.content);
            console.log('Successfully parsed content for report:', report.id);
          } catch (error) {
            console.error('Failed to parse report content for report', report.id, ':', error);
            report.content = {};
          }
        }
        return report;
      });
      console.log('Local reports found:', localReports.length);
      
      // Also try to get reports from the old API system for backward compatibility
      let apiReports: any[] = [];
      try {
        const syncStatus = syncService.getSyncStatus();
        if (syncStatus.isOnline) {
          try {
            const response = await ApiClient.getInstance().get<{ data: any[] }>('/reports');
            apiReports = response.data || [];
            console.log('API reports found:', apiReports.length);
          } catch (apiError) {
            console.log('API reports failed, using local only:', apiError);
          }
        }
      } catch (error) {
        console.log('API check failed:', error);
      }
      
      // Combine local and API reports, avoiding duplicates
      const allReports = [...localReports];
      
      // Add API reports that don't exist locally
      apiReports.forEach(apiReport => {
        // Improved duplicate detection: check multiple criteria
        const existsLocally = localReports.some((localReport: any) => {
          // Primary check: same ID (for synced reports)
          if (localReport.id === apiReport._id) {
            return true;
          }
          
          // Secondary check: same unique identifier (if available)
          if (localReport.uniqueIdentifier && apiReport.uniqueIdentifier && 
              localReport.uniqueIdentifier === apiReport.uniqueIdentifier) {
            return true;
          }
          
          // Tertiary check: same title AND same generated timestamp (for unsynced reports)
          if (localReport.title === apiReport.title && 
              localReport.generatedAt && 
              apiReport.generated_at) {
            const localTime = new Date(localReport.generatedAt).getTime();
            const apiTime = new Date(apiReport.generated_at).getTime();
            // Allow 5 minute tolerance for timestamp differences
            if (Math.abs(localTime - apiTime) < 5 * 60 * 1000) {
              return true;
            }
          }
          
          // Quaternary check: same property, client, and agent combination
          if (localReport.propertyId === apiReport.property_id &&
              localReport.clientId === apiReport.client_id &&
              localReport.agentId === apiReport.agent_id &&
              localReport.title === apiReport.title) {
            return true;
          }
          
          return false;
        });
        
        if (!existsLocally) {
          // Parse content if it's a JSON string
          let parsedContent = apiReport.content || {};
          if (typeof parsedContent === 'string') {
            try {
              parsedContent = JSON.parse(parsedContent);
            } catch (error) {
              console.error('Failed to parse API report content for report', apiReport._id, ':', error);
              parsedContent = {};
            }
          }
          
          allReports.push({
            id: apiReport._id,
            title: apiReport.title,
            reportType: apiReport.report_type || 'inspection',
            propertyId: apiReport.property_id,
            clientId: apiReport.client_id,
            agentId: apiReport.agent_id,
            content: parsedContent,
            status: apiReport.status || 'Draft',
            generatedAt: new Date(apiReport.generated_at),
            generatedBy: apiReport.generated_by,
            propertyName: apiReport.property_name,
            clientName: apiReport.client_name,
            agentName: apiReport.agent_name,
            agentEmail: apiReport.agent_email,
            clientEmail: apiReport.client_email,
            isSynced: true, // API reports are already synced
            syncError: null,
            createdAt: new Date(apiReport.createdAt || apiReport.generated_at),
            updatedAt: new Date(apiReport.updatedAt || apiReport.generated_at)
          });
        }
      });
      
      setRawReports(allReports);
      
      // Transform the data to match the expected format
      const transformedReports = allReports.map((report: any) => {
        return {
          id: report.id,
          title: report.title,
          property: formatAddress(report.propertyName) || 'Property',
          client: report.clientName || 'Client',
          agent: report.agentName || 'Agent',
          type: report.reportType || 'Report',
          date: new Date(report.generatedAt || report.createdAt).toLocaleDateString(),
          status: report.status || 'Draft',
          isSynced: report.isSynced || false,
          // Keep original data for filtering
          _originalReport: report
        };
      });
      
      // Filter reports to show only those created by the current user
      const userReports = transformedReports.filter(report => {
        if (!user) return false;
        
        const reportData = report._originalReport;
        
        // Check if this report was created by the current user
        const isCreatedByUser = 
          // Check by agent ID
          (reportData.agentId === user.id || 
           reportData.agentId === user.id?.toString()) ||
          // Check by agent name
          (reportData.agentName === user.name) ||
          (reportData.agentName === user.email) ||
          (reportData.agentName === (user as any).databaseName) ||
          // Check by generated_by field
          (reportData.generatedBy === (user as any).databaseName) ||
          (reportData.generatedBy === user.email);
        
        console.log(`Report ${report.id} created by user:`, isCreatedByUser, {
          agentId: reportData.agentId,
          agentName: reportData.agentName,
          generatedBy: reportData.generatedBy,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userDatabase: (user as any).databaseName
        });
        
        return isCreatedByUser;
      });
      
      console.log(`Filtered ${userReports.length} reports for current user out of ${transformedReports.length} total`);
      setReports(userReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports');
      setReports([]);
      setRawReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle report generation success
  const handleReportGenerated = async () => {
    try {
      console.log('Report generated, refreshing reports list...');
      
      // Force a fresh reload of reports
      await loadReports();
      
      // Show success popup
      setSuccessPopupData({
        title: t('reports.reportCreatedSuccessfully'),
        message: t('reports.reportGeneratedMessage'),
        type: 'success'
      });
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Error handling report generation:', error);
      // Show error popup if something went wrong
      setSuccessPopupData({
        title: t('common.error'),
        message: t('reports.failedToRefreshList'),
        type: 'error'
      });
      setShowSuccessPopup(true);
    }
  };

  // Handle manual refresh with deletion checking
  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      console.log('Manual refresh triggered - checking for deleted reports...');
      
      // Check for deleted reports if online
      const syncStatus = syncService.getSyncStatus();
      if (syncStatus.isOnline) {
        await simpleSyncService.checkForDeletedReportsManually();
      }
      
      // Reload reports
      await loadReports();
      
      // Show success popup
      setSuccessPopupData({
        title: t('reports.reportsRefreshed'),
        message: t('reports.reportsListUpdated'),
        type: 'success'
      });
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Error during manual refresh:', error);
      setSuccessPopupData({
        title: t('reports.refreshError'),
        message: t('reports.failedToRefresh'),
        type: 'error'
      });
      setShowSuccessPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.client.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleSendEmail = async (item: ReportDisplay) => {
    try {
      // Find the full report data to get email addresses
      const fullReport = rawReports.find(report => report.id === item.id);
      
      if (!fullReport) {
        Alert.alert(t('common.error'), t('reports.reportDataNotFound'));
        return;
      }
      
      // Extract email addresses from the report data
      const agentEmail = 
        fullReport.agentEmail ||                // From our simple database
        fullReport.agent_id?.email ||           // Direct from agent_id object
        fullReport.agent_email ||               // From agent_email field
        fullReport.content?.agent?.email ||     // From content.agent.email
        user?.email ||                          // Fallback to current user email
        t('reports.noEmailAvailable');
      
      const clientEmail = 
        fullReport.clientEmail ||               // From our simple database
        fullReport.client_id?.email ||          // Direct from client_id object
        fullReport.client_email ||              // From client_email field
        fullReport.content?.client?.email ||    // From content.client.email
        fullReport.content?.clientEmail ||      // Alternative client email field
        t('reports.noEmailAvailable');
      
      setEmailModalData({
        reportId: item.id,
        reportTitle: item.title,
        agentEmail,
        clientEmail
      });
      setShowEmailModal(true);
    } catch (error) {
      console.error('Error preparing email data:', error);
      Alert.alert(t('common.error'), t('reports.failedToLoadEmailData'));
    }
  };

  const handleConfirmEmail = async () => {
    if (!emailModalData) return;
    
    try {
      setLoading(true);
      
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
        error?: string;
        results?: {
          agent?: { success: boolean; error?: string; mock?: boolean };
          client?: { success: boolean; error?: string; mock?: boolean };
        };
      }>('/reports/send-email', {
        reportId: emailModalData.reportId,
        agentEmail: emailModalData.agentEmail,
        clientEmail: emailModalData.clientEmail
      });

      if (response.success) {
        // Show success popup
        setEmailSuccessPopupData({
          title: t('reports.emailSentSuccessfully'),
          message: t('reports.emailSentMessage'),
          type: 'success'
        });
        setShowEmailSuccessPopup(true);
      } else {
        Alert.alert(t('common.error'), response.error || t('reports.failedToSendEmails'));
      }
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert(t('common.error'), t('reports.failedToSendEmailsWithConnection'));
    } finally {
      setLoading(false);
      setShowEmailModal(false);
      setEmailModalData(null);
    }
  };

  const handleViewReport = async (item: ReportDisplay) => {
    try {
      setLoadingReportDetails(true);
      console.log('=== VIEWING REPORT ===');
      console.log('Report ID:', item.id);
      console.log('Report title:', item.title);
      
      let fullReport = null;
      
      // Always try to fetch from server first (like email does)
      const syncStatus = syncService.getSyncStatus();
      if (syncStatus.isOnline) {
        try {
          console.log('Fetching report from server...');
          const response = await ApiClient.getInstance().get(`/reports/${item.id}`) as any;
          fullReport = response.data;
          console.log('Server report fetched successfully');
        } catch (error) {
          console.log('Failed to fetch from server, trying local data:', error);
        }
      }
      
      // Fallback to local data if server fetch failed
      if (!fullReport) {
        console.log('Using local data as fallback...');
        fullReport = rawReports.find(report => report.id === item.id);
        
        if (fullReport) {
          // Parse content if it's a JSON string
          if (typeof fullReport.content === 'string') {
            try {
              fullReport.content = JSON.parse(fullReport.content);
            } catch (error) {
              console.error('Failed to parse report content:', error);
              fullReport.content = {};
            }
          }
        }
      }
      
      if (!fullReport) {
        Alert.alert(t('common.error'), t('reports.reportNotFound'));
        return;
      }
      
      // Debug: Log the report content to see what's stored
      console.log('=== REPORT CONTENT DEBUG ===');
      console.log('Full report:', JSON.stringify(fullReport, null, 2));
      console.log('Report content type:', typeof fullReport?.content);
      console.log('Report content:', JSON.stringify(fullReport?.content, null, 2));
      console.log('Report images:', fullReport?.content?.images);
      console.log('Report inspectionData:', fullReport?.content?.inspectionData);
      console.log('Report inspectionAreas:', fullReport?.content?.inspectionAreas);
      console.log('Content keys:', fullReport?.content ? Object.keys(fullReport.content) : 'No content');
      console.log('API Base URL:', ApiClient.getInstance().getImageUrl('/api/images/test'));
      
      // Validate that all images have server URLs (no local URIs should exist)
      if (fullReport?.content?.images) {
        console.log('=== VALIDATING IMAGE URIs ===');
        let hasLocalUris = false;
        Object.keys(fullReport.content.images).forEach(area => {
          Object.keys(fullReport.content.images[area]).forEach(field => {
            const images = fullReport.content.images[area][field];
            if (Array.isArray(images)) {
              images.forEach((image, index) => {
                if (image.uri && image.uri.startsWith('file://')) {
                  console.error(`ERROR: LOCAL URI FOUND IN DATABASE: ${area}.${field}[${index}] = ${image.uri}`);
                  hasLocalUris = true;
                } else if (image.uri && image.uri.startsWith('/api/images/')) {
                  console.log(`VALID SERVER URL: ${area}.${field}[${index}] = ${image.uri}`);
                } else if (image.uri) {
                  console.warn(`UNKNOWN URI TYPE: ${area}.${field}[${index}] = ${image.uri}`);
                }
              });
            }
          });
        });
        
        if (hasLocalUris) {
          console.error('CRITICAL ERROR: Local URIs found in database - this should not happen!');
        }
      }
      
      setSelectedReport(item);
      setSelectedRawReport(fullReport);
      setShowReportModal(true);
    } catch (e) {
      console.error('Error loading report details:', e);
      Alert.alert('Error', 'Failed to load report details');
    } finally {
      setLoadingReportDetails(false);
    }
  };

  const renderReportItem = ({ item }: { item: ReportDisplay }) => (
    <HoveringCard style={styles.reportCardContainer}>
      <View
        style={[
          styles.reportCard,
          isDarkMode
            ? { backgroundColor: 'transparent', borderColor: colors.gray[200] }
            : { backgroundColor: colors.white, borderColor: colors.gray[200] }
        ]}
      >
        <View style={styles.reportHeader}>
          <View style={[styles.reportIcon, { backgroundColor: colors.blue[50] }]}>
            <Icon name="description" size={20} color={colors.icon} />
          </View>
          <View style={styles.reportInfo}>
            <View style={styles.reportTitleRow}>
              <Text style={[styles.reportTitle, { color: colors.gray[900] }]}>{item.title}</Text>
              {item.isSynced === false && (
                <View style={[styles.syncBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Icon name="cloud-off" size={12} color={colors.warning} />
                  <Text style={[styles.syncBadgeText, { color: colors.warning }]}>Local</Text>
                </View>
              )}
              {item.isSynced === true && (
                <View style={[styles.syncBadge, { backgroundColor: colors.success + '20' }]}>
                  <Icon name="cloud-done" size={12} color={colors.success} />
                  <Text style={[styles.syncBadgeText, { color: colors.success }]}>Synced</Text>
                </View>
              )}
            </View>
            <Text style={[styles.reportType, { color: colors.gray[600] }]}>{item.type}</Text>
          </View>
        </View>
        <View style={styles.reportDetails}>
          <View style={styles.detailRow}>
            <Icon name="home" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.gray[700] }]}>{item.property}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="person" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.gray[700] }]}>{item.client}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="person-pin" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.gray[700] }]}>{item.agent}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="event" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.gray[700] }]}>{item.date}</Text>
          </View>
        </View>

        <View style={styles.reportActions}>
          <HoveringCard style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.blue[50] }]}
              onPress={() => handleViewReport(item)}
            >
              <Icon name="visibility" size={16} color={colors.icon} />
              <Text style={[styles.actionText, { color: colors.primary }]}>{t('common.view')}</Text>
            </TouchableOpacity>
          </HoveringCard>
          
          <HoveringCard style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton, 
                { backgroundColor: colors.green[50] }
              ]}
              onPress={() => handleSendEmail(item)}
            >
              <Icon name="email" size={16} color={colors.green[600]} />
              <Text style={[styles.actionText, { color: colors.green[600] }]}>
                {t('reports.email')}
              </Text>
            </TouchableOpacity>
          </HoveringCard>
        </View>
      </View>
    </HoveringCard>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="assessment" size={64} color={colors.gray[400]} />
      <Text style={[styles.emptyMessage, { color: colors.gray[500] }]}>
        {t('reports.noReports')}
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.gray[400] }]}>
        {t('reports.noReportsMessage')}
      </Text>
    </View>
  );

  const renderInspectionContent = (content: any, imagesData?: any) => {
    console.log('=== RENDER INSPECTION CONTENT DEBUG ===');
    console.log('Content received:', JSON.stringify(content, null, 2));
    console.log('Content type:', typeof content);
    console.log('Content is null/undefined:', content == null);
    console.log('Content keys:', content ? Object.keys(content) : 'No content');
    console.log('Images data received:', JSON.stringify(imagesData, null, 2));
    
    if (!content) {
      console.log('No content provided, returning null');
      return null;
    }

    const inspectionAreas = [
      { key: 'exterior', title: getAreaTitle('exterior'), icon: 'home' },
      { key: 'interior', title: getAreaTitle('interior'), icon: 'room' },
      { key: 'electrical', title: getAreaTitle('electrical'), icon: 'electrical-services' },
      { key: 'plumbing', title: getAreaTitle('plumbing'), icon: 'plumbing' },
      { key: 'hvac', title: getAreaTitle('hvac'), icon: 'ac-unit' },
      { key: 'safety', title: getAreaTitle('safety'), icon: 'security' },
      // Add signatures as a special inspection area if they exist
      ...(content.signatures ? [{ key: 'signatures', title: t('signature.signatures'), icon: 'edit' }] : [])
    ];

    return inspectionAreas.map(area => {
      const areaData = content[area.key];
      const areaImages = imagesData?.[area.key];
      console.log(`Area ${area.key} data:`, areaData);
      console.log(`Area ${area.key} images:`, areaImages);
      if (!areaData && !areaImages) return null;

      // Special handling for signatures area
      if (area.key === 'signatures') {
        const signatures = areaData;
        if (!signatures || (!signatures.agent && !signatures.client)) return null;

        const normalizeSignatureUri = (sig: any): string | null => {
          if (!sig) return null;
          let uri = typeof sig === 'string' ? sig : sig.uri;
          if (!uri) return null;
          if (uri.startsWith('file://')) return null; // never display local URIs
          if (uri.startsWith('/api/images/')) {
            uri = ApiClient.getInstance().getImageUrl(uri);
          }
          return uri;
        };

        const agentUri = normalizeSignatureUri(signatures.agent);
        const clientUri = normalizeSignatureUri(signatures.client);

        return (
          <View key={area.key} style={styles.modalSection}>
            <View style={styles.inspectionAreaHeader}>
              <Icon name={area.icon} size={20} color={colors.primary} style={styles.headerIcon} />
              <Text style={[styles.modalSectionTitle, { color: colors.gray[900] }]}>{area.title}</Text>
            </View>
            <View style={styles.signaturesContainer}>
              {agentUri && (
                <View style={styles.signatureItem}>
                  <Text style={[styles.signatureLabel, { color: colors.gray[600] }]}>{t('signature.agentSignature')}</Text>
                  <View style={[styles.signatureDisplay, { borderColor: colors.gray[200] }]}>
                    <ImageWithFallback uri={agentUri} style={styles.signatureImage} />
                  </View>
                </View>
              )}
              {clientUri && (
                <View style={styles.signatureItem}>
                  <Text style={[styles.signatureLabel, { color: colors.gray[600] }]}>{t('signature.clientSignature')}</Text>
                  <View style={[styles.signatureDisplay, { borderColor: colors.gray[200] }]}>
                    <ImageWithFallback uri={clientUri} style={styles.signatureImage} />
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      }

      // Merge fields from areaData and areaImages, preferring images for *_images fields
      const mergedFields: any = { ...(areaData || {}) };
      if (areaImages) {
        Object.entries(areaImages).forEach(([fieldKey, images]) => {
          mergedFields[fieldKey] = images; // override or add image fields
        });
      }

      // Convert object entries to array and create pairs for grid
      const entries = Object.entries(mergedFields);
      console.log(`Area ${area.key} entries:`, entries);

      const pairs = [];
      for (let i = 0; i < entries.length; i += 2) {
        pairs.push(entries.slice(i, i + 2));
      }

      return (
        <View key={area.key} style={styles.modalSection}>
          <View style={styles.inspectionAreaHeader}>
            <Icon name={area.icon} size={20} color={colors.primary} style={styles.headerIcon} />
            <Text style={[styles.modalSectionTitle, { color: colors.gray[900] }]}>{area.title}</Text>
          </View>
          {pairs.map((pair, pairIndex) => (
            <View key={pairIndex} style={styles.gridRow}>
              {pair.map(([fieldKey, value]) => {
                // Check if this is an image field
                const isImageField = fieldKey.includes('_images') || (Array.isArray(value) && value.length > 0 && value[0]?.uri);
                
                // Debug: Log image field data
                if (isImageField) {
                  console.log(`Image field ${fieldKey}:`, value);
                  console.log(`Image field ${fieldKey} type:`, typeof value);
                  console.log(`Image field ${fieldKey} is array:`, Array.isArray(value));
                  if (Array.isArray(value)) {
                    console.log(`Image field ${fieldKey} length:`, value.length);
                    value.forEach((img, idx) => {
                      console.log(`Image ${idx}:`, img);
                    });
                  }
                }
                
                return (
                  <View key={fieldKey} style={[styles.gridItem, { backgroundColor: colors.gray[50], borderColor: colors.gray[200] }]}>
                    <Text style={[styles.gridItemTitle, { color: colors.gray[600] }]}>{getFieldLabel(String(fieldKey))}</Text>
                    {isImageField ? (
                      <View style={styles.imageContainer}>
                        {Array.isArray(value) && value.length > 0 ? (
                          <View style={styles.imageGrid}>
                            {value.map((image: any, index: number) => {
                              console.log(`Rendering image ${index}:`, image);
                              
                              // Handle image URI - only server URLs should exist
                              let imageUri = image.uri;
                              
                              // Reject local file URIs - they should not exist in the database
                              if (imageUri && imageUri.startsWith('file://')) {
                                console.error('ERROR: Local URI found in database - this should not happen!', imageUri);
                                return (
                                  <View key={index} style={styles.imageItem}>
                                    <View style={[styles.imagePreview, { backgroundColor: colors.red[50], justifyContent: 'center', alignItems: 'center' }]}>
                                      <Icon name="error" size={16} color={colors.red[600]} />
                                      <Text style={{ fontSize: 8, color: colors.red[600], textAlign: 'center', marginTop: 2 }}>
                                        {t('reports.invalidUri')}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              }
                              
                              // Convert relative URL to absolute URL for display
                              if (imageUri && imageUri.startsWith('/api/images/')) {
                                const originalUri = imageUri;
                                imageUri = ApiClient.getInstance().getImageUrl(imageUri);
                                console.log(`Converted image URL: ${originalUri} -> ${imageUri}`);
                              }
                              
                              return (
                                <View key={index} style={styles.imageItem}>
                                  <ImageWithFallback 
                                    uri={imageUri} 
                                    style={styles.imagePreview}
                                  />
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={[styles.gridItemValue, { color: colors.gray[500] }]}>{t('images.noImages')}</Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[styles.gridItemValue, { color: colors.gray[900] }]}>
                        {translateOptionValue(value) || t('images.notSpecified')}
                      </Text>
                    )}
                  </View>
                );
              })}
              {/* Add empty item if odd number of items */}
              {pair.length === 1 && <View style={[styles.gridItem, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />}
            </View>
          ))}
        </View>
      );
    });
  };

  const renderReportModal = () => {
    // Prefer the freshly fetched selectedRawReport; fall back to list cache
    const rawReport = selectedRawReport || rawReports.find(report => report._id === selectedReport?.id);
    
    return (
      <Modal visible={showReportModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
          <StatusBar barStyle={colors.gray[900] === '#111827' ? 'light-content' : 'dark-content'} />
          <View style={[styles.modalHeader, { borderBottomColor: colors.gray[200] }]}>
            <Text style={[styles.modalTitle, { color: colors.gray[900] }]}>{t('reports.reportDetails')}</Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {loadingReportDetails ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.gray[600] }]}>{t('reports.loadingReportDetails')}</Text>
            </View>
          ) : selectedReport && (
            <ScrollView style={[styles.modalContent, { backgroundColor: colors.white }]}>
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.gray[900] }]}>{t('reports.reportInformation')}</Text>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.title')}:</Text>
                  <Text style={[styles.modalValue, { color: colors.gray[900] }]}>{selectedReport.title}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.type')}:</Text>
                  <Text style={[styles.modalValue, { color: colors.gray[900] }]}>{selectedReport.type}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.date')}:</Text>
                  <Text style={[styles.modalValue, { color: colors.gray[900] }]}>{selectedReport.date}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.gray[900] }]}>{t('reports.propertyDetails')}</Text>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.property')}:</Text>
                  <Text style={[styles.modalValue, { color: colors.gray[900] }]}>{selectedReport.property}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.gray[900] }]}>{t('reports.peopleInvolved')}</Text>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.client')}:</Text>
                  <Text style={[styles.modalValue, { color: colors.gray[900] }]}>{selectedReport.client}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.agent')}:</Text>
                  <Text style={[styles.modalValue, { color: colors.gray[900] }]}>{selectedReport.agent}</Text>
                </View>
              </View>

              {/* Security Deposit Section */}
              {rawReport?.content?.securityDeposit && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.gray[900] }]}>{t('reports.securityDeposit')}</Text>
                  <View style={styles.modalRow}>
                    <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.amount')}</Text>
                    <Text style={[styles.modalValue, { color: colors.gray[900] }]}>
                      {rawReport.content.securityDeposit.currency} {rawReport.content.securityDeposit.amount}
                    </Text>
                  </View>
                  {rawReport.content.securityDeposit.paymentMethod && (
                    <View style={styles.modalRow}>
                      <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.paymentMethod')}</Text>
                      <Text style={[styles.modalValue, { color: colors.gray[900] }]}>
                        {rawReport.content.securityDeposit.paymentMethod}
                      </Text>
                    </View>
                  )}
                  {rawReport.content.securityDeposit.notes && (
                    <View style={styles.modalRow}>
                      <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.notes')}</Text>
                      <Text style={[styles.modalValue, { color: colors.gray[900] }]}>
                        {rawReport.content.securityDeposit.notes}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Inspection Content */}
              {(() => {
                console.log('=== MODAL INSPECTION CONTENT DEBUG ===');
                console.log('Raw report:', rawReport);
                console.log('Raw report content:', rawReport?.content);
                console.log('Content inspectionData:', rawReport?.content?.inspectionData);
                console.log('Content inspectionAreas:', rawReport?.content?.inspectionAreas);
                console.log('Content images:', rawReport?.content?.images);
                
                // Use the same logic as the email functionality
                const areasSource = rawReport?.content?.inspectionData || rawReport?.content?.inspectionAreas || rawReport?.content;
                const imagesData = rawReport?.content?.images;
                
                console.log('Areas source:', areasSource);
                console.log('Images data:', imagesData);
                console.log('Will render inspection content:', !!(areasSource || imagesData));
                
                // Additional debugging for content structure
                if (rawReport?.content) {
                  console.log('Content keys:', Object.keys(rawReport.content));
                  console.log('Content inspectionData keys:', rawReport.content.inspectionData ? Object.keys(rawReport.content.inspectionData) : 'No inspectionData');
                  console.log('Content inspectionAreas keys:', rawReport.content.inspectionAreas ? Object.keys(rawReport.content.inspectionAreas) : 'No inspectionAreas');
                }
                
                if (!areasSource && !imagesData) {
                  console.log('No areas source or images data, showing fallback content');
                  return (
                    <View style={styles.modalSection}>
                      <Text style={[styles.modalSectionTitle, { color: colors.gray[900] }]}>{t('reports.inspectionDetails')}</Text>
                      <View style={styles.modalRow}>
                        <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.status')}</Text>
                        <Text style={[styles.modalValue, { color: colors.gray[900] }]}>{t('reports.noInspectionDataAvailable')}</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.contentType')}</Text>
                        <Text style={[styles.modalValue, { color: colors.gray[900] }]}>
                          {rawReport?.content ? t('reports.contentExistsNoData') : t('reports.noContentFound')}
                        </Text>
                      </View>
                      {rawReport?.content && (
                        <View style={styles.modalRow}>
                          <Text style={[styles.modalLabel, { color: colors.gray[600] }]}>{t('reports.contentKeys')}</Text>
                          <Text style={[styles.modalValue, { color: colors.gray[900] }]}>
                            {Object.keys(rawReport.content).join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                }
                
                return (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: colors.gray[900] }]}>{t('reports.inspectionDetails')}</Text>
                    {renderInspectionContent(areasSource, imagesData)}
                  </View>
                ); 
              })()}

              {/* Signatures Section */}
              {(() => {
                // Check multiple sources for signatures: inspectionData.signatures, content.signatures, and root signatures
                const inspectionSignatures = rawReport?.content?.inspectionData?.signatures;
                const contentSignatures = rawReport?.content?.signatures;
                const rootSignatures = rawReport?.signatures;
                const imagesRoot = rawReport?.content?.images;

                const normalizeSignatureUri = (sig: any): string | null => {
                  if (!sig) return null;
                  let uri = typeof sig === 'string' ? sig : sig.uri;
                  if (!uri) return null;
                  if (uri.startsWith('file://')) return null; // never display local URIs
                  if (uri.startsWith('/api/images/')) {
                    uri = ApiClient.getInstance().getImageUrl(uri);
                  }
                  return uri;
                };

                // Priority order: inspectionData.signatures > content.signatures > root signatures > images.general
                let agentUri = normalizeSignatureUri(inspectionSignatures?.agent) ||
                              normalizeSignatureUri(contentSignatures?.agent) ||
                              normalizeSignatureUri(rootSignatures?.agent);
                let clientUri = normalizeSignatureUri(inspectionSignatures?.client) ||
                               normalizeSignatureUri(contentSignatures?.client) ||
                               normalizeSignatureUri(rootSignatures?.client);

                // Fallback to images.general if not found in signatures
                if (!agentUri && imagesRoot?.general?.agentSignature?.[0]?.uri) {
                  agentUri = normalizeSignatureUri(imagesRoot.general.agentSignature[0]);
                }
                if (!clientUri && imagesRoot?.general?.clientSignature?.[0]?.uri) {
                  clientUri = normalizeSignatureUri(imagesRoot.general.clientSignature[0]);
                }

                if (!agentUri && !clientUri) return null;
              })()}

            </ScrollView>
          )}
        </View>
      </Modal>
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray[50] }]}>
      <StatusBar barStyle={colors.gray[900] === '#111827' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.gray[200] }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.title, { color: colors.gray[900] }]}>{t('nav.reports')}</Text>
            <Text style={[styles.subtitle, { color: colors.gray[600] }]}>{t('reports.subtitle')}</Text>
          </View>
          <OfflineIndicator />
        </View>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: colors.white, borderBottomColor: colors.gray[200] }]}> 
        <View style={[styles.searchContainer, { backgroundColor: colors.gray[100] }]}>
          <Icon name="search" size={20} color={colors.icon} style={styles.searchIcon} /> 
          <TextInput
            style={[styles.searchInput, { color: colors.gray[900] }]}
            placeholder={t('reports.searchPlaceholder')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor={colors.gray[500]}
          />
        </View>
      </View>


      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.red[50], borderColor: colors.red[100] }]}>
          <Icon name="error" size={24} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filteredReports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={handleManualRefresh} 
            colors={[colors.primary]} 
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {renderReportModal()}

      <HoveringCard style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setIsGenerateModalOpen(true)}
        >
          <Icon name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </HoveringCard>

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          setSelectedReportType('inspection');
        }}
        onReportGenerated={handleReportGenerated}
        reportType={selectedReportType}
      />

      {/* Email Confirmation Modal */}
      <EmailConfirmationModal
        isVisible={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setEmailModalData(null);
        }}
        onConfirm={handleConfirmEmail}
        title={t('reports.sendReportViaEmail')}
        subtitle={t('reports.sendEmailConfirmation', { title: emailModalData?.reportTitle || '' })}
        primaryActionText={t('reports.sendEmail')}
        secondaryActionText={t('common.cancel')}
        isLoading={loading}
        agentEmail={emailModalData?.agentEmail}
        clientEmail={emailModalData?.clientEmail}
      />


      {/* Styled Success Popup for Report Generation */}
      <StyledPopup
        isVisible={showSuccessPopup}
        onClose={() => {
          setShowSuccessPopup(false);
          setSuccessPopupData(null);
        }}
        title={successPopupData?.title || ''}
        message={successPopupData?.message || ''}
        type={successPopupData?.type || 'success'}
        duration={3000} // Auto-close after 3 seconds
      />

      {/* Styled Success Popup for Email Sending */}
      <StyledPopup
        isVisible={showEmailSuccessPopup}
        onClose={() => {
          setShowEmailSuccessPopup(false);
          setEmailSuccessPopupData(null);
        }}
        title={emailSuccessPopupData?.title || ''}
        message={emailSuccessPopupData?.message || ''}
        type={emailSuccessPopupData?.type || 'success'}
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
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  reportCardContainer: {
    marginBottom: 16,
  },
  reportCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderColor: baseColors.gray[200],
    backgroundColor: baseColors.white,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  reportType: {
    fontSize: 14,
    fontWeight: '500',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  actionButtonContainer: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    // Enhanced for better interaction
    minHeight: 44,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessage: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    flex: 1,
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 80,
  },
  modalValue: {
    fontSize: 14,
    flex: 1,
  },
  inspectionAreaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    marginRight: 8,
    marginTop: 0,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  gridItem: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  gridItemTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  gridItemValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    // Enhanced for better floating effect
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageContainer: {
    marginTop: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: baseColors.gray[200],
    backgroundColor: baseColors.gray[100],
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageAreaSection: {
    marginBottom: 16,
  },
  imageAreaTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  imageFieldSection: {
    marginBottom: 12,
  },
  imageFieldTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  signatureItem: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  signatureDisplay: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: baseColors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default ReportsScreen;