import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert,
  Linking,
  Dimensions,
  Animated,
  StatusBar,
  RefreshControl 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useStats } from '../hooks/useStats';
import { colors } from '../styles/colors';
import { syncService } from '../services/syncService';
import OfflineIndicator from '../components/OfflineIndicator';
import LoadingScreen from '../components/LoadingScreen';
import ApiClient, { API_ENDPOINTS } from '../config/api';

const { width, height } = Dimensions.get('window');

interface FloatingCardProps {
  children: React.ReactNode;
  style?: any;
  delay?: number;
}

const FloatingCard: React.FC<FloatingCardProps> = ({ children, style, delay = 0 }) => {
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 3000 + delay,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 3000 + delay,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue, delay]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <Animated.View
      style={[
        style,
        { 
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  showArrow?: boolean;
  danger?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  titleColor?: string; // optional override for title color
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightComponent,
  showArrow = true,
  danger = false,
  isFirst = false,
  isLast = false,
  titleColor
}) => {
  const { colors, isDarkMode } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[
        styles.settingItem, 
        { backgroundColor: colors.white },
        isFirst && styles.firstItem,
        isLast && styles.lastItem
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: colors.blue[50] },
          danger && styles.dangerIcon
        ]}>
          <Icon 
            name={icon} 
            size={24} 
            color={danger ? (isDarkMode ? colors.icon : colors.primary) : colors.icon} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[
            styles.settingTitle,
            { color: titleColor ?? (danger ? (isDarkMode ? colors.icon : colors.primary) : colors.gray[900]) }
          ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.gray[600] }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && onPress && (
          <Icon name="chevron-right" size={24} color={colors.icon} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { colors, isDarkMode, setDarkMode } = useTheme();
  const { t } = useLanguage();
  const { userStats, isLoading: isStatsLoading, refreshStats } = useStats();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load settings from AsyncStorage on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [
        notifications,
        emailNotifications,
        autoSync,
        biometric
      ] = await Promise.all([
        AsyncStorage.getItem('notificationsEnabled'),
        AsyncStorage.getItem('emailNotificationsEnabled'),
        AsyncStorage.getItem('autoSyncEnabled'),
        AsyncStorage.getItem('biometricEnabled')
      ]);

      setNotificationsEnabled(notifications ? JSON.parse(notifications) : false);
      setEmailNotificationsEnabled(emailNotifications ? JSON.parse(emailNotifications) : false);
      setAutoSyncEnabled(autoSync ? JSON.parse(autoSync) : false);
      setBiometricEnabled(biometric ? JSON.parse(biometric) : false);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsSettingsLoaded(true);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadSettings(),
        refreshStats()
      ]);
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshStats]);

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    saveSetting('notificationsEnabled', value);
  };

  const handleEmailNotificationsToggle = (value: boolean) => {
    setEmailNotificationsEnabled(value);
    saveSetting('emailNotificationsEnabled', value);
  };

  const handleAutoSyncToggle = (value: boolean) => {
    setAutoSyncEnabled(value);
    saveSetting('autoSyncEnabled', value);
  };

  const handleBiometricToggle = (value: boolean) => {
    setBiometricEnabled(value);
    saveSetting('biometricEnabled', value);
  };

  const handleLogout = () => {
    Alert.alert(
      t('alert.logout'),
      t('alert.logoutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('alert.logout'), style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      t('alert.exportData'),
      t('alert.exportDataMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.exportData'), onPress: () => {
          // TODO: Implement data export
          Alert.alert(t('common.success'), t('alert.exportSuccess'));
        }}
      ]
    );
  };

  const handleSendAllReportPdfsEmail = async () => {
    try {
      // Confirm action
      Alert.alert(
        'Send All PDFs',
        'This will email ALL report PDFs in a single email to your address. Continue?',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: 'Send',
            onPress: async () => {
              try {
                const api = ApiClient.getInstance();
                await api.post(API_ENDPOINTS.REPORTS.LIST + '/send-email-bulk', {
                  recipientEmail: user?.email || undefined
                });
                Alert.alert('Success', 'All report PDFs are being sent to your email.');
              } catch (error) {
                console.error('Error sending all report PDFs in one email:', error);
                Alert.alert('Error', 'Failed to send PDFs. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error preparing send-all-PDFs:', error);
      Alert.alert('Error', 'Failed to start sending PDFs.');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      t('alert.clearCache'),
      t('alert.clearCacheMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.clearCache'), style: 'destructive', onPress: () => {
          // TODO: Implement cache clearing
          Alert.alert(t('common.success'), t('alert.clearCacheSuccess'));
        }}
      ]
    );
  };

  const handleSyncData = async () => {
    try {
      const syncStatus = syncService.getSyncStatus();
      
      if (!syncStatus.isOnline) {
        Alert.alert(
          'Offline',
          'Cannot sync data while offline. Please check your internet connection.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Sync Data',
        'This will synchronize all your data with the server. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sync', 
            onPress: async () => {
              try {
                await syncService.syncAllData();
                Alert.alert('Success', 'Data synchronized successfully!');
              } catch (error) {
                Alert.alert('Error', 'Failed to sync data. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to sync data. Please try again.');
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:info@kurz-immobilien.ch');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://kurz-immobilien.ch/datenschutz/');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://kurz-immobilien.ch/agb/');
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handlePasswordChangeSuccess = () => {
    // Optionally show a success message or perform additional actions
    Alert.alert(
      t('profile.passwordChanged'),
      t('profile.passwordChangedMessage'),
      [
        {
          text: t('profile.ok'),
          onPress: () => {
            // Logout user after password change
            logout();
          },
        },
      ]
    );
  };

  if (!isSettingsLoaded || isStatsLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.gray[50] }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Background Gradient Effect */}
      {/* <View style={[styles.backgroundGradient, { backgroundColor: colors.primary }]} /> */}
      
      {/* Floating Background Elements */}
      <FloatingCard style={[styles.floatingElement, styles.floatingElement1, { backgroundColor: colors.primary + '20' }]} delay={0}>
        <View />
      </FloatingCard>
      <FloatingCard style={[styles.floatingElement, styles.floatingElement2, { backgroundColor: colors.secondary + '15' }]} delay={1000}>
        <View />
      </FloatingCard>
      <FloatingCard style={[styles.floatingElement, styles.floatingElement3, { backgroundColor: colors.secondary + '10' }]} delay={2000}>
        <View />
      </FloatingCard>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header with Profile Card */}
        <FloatingCard style={styles.headerContainer} delay={500}>
          <View style={[styles.header, { backgroundColor: 'transparent' }]}>
            <View style={styles.headerContent}>
              <View>
                <Text style={[styles.title, { color: colors.white }]}>{t('settings.title')}</Text>
                <Text style={[styles.subtitle, { color: colors.white + 'CC' }]}>{t('settings.subtitle')}</Text>
              </View>
              <OfflineIndicator style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            </View>
          </View>

          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.white, borderColor: colors.gray[200] }]}>
            <View style={styles.profileInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={[styles.profileName, { color: colors.gray[900] }]}>{user?.name || 'User'}</Text>
                <Text style={[styles.profileEmail, { color: colors.gray[600] }]}>{user?.email || 'user@example.com'}</Text>
                <View style={[styles.roleBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.profileRole, { color: colors.primary }]}>{user?.role || 'Agent'}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.profileStats, { borderTopColor: colors.gray[100] }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {isStatsLoading ? '...' : userStats.inspections}
                </Text>
                <Text style={[styles.statLabel, { color: colors.gray[600] }]}>{t('profile.inspections')}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.gray[200] }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {isStatsLoading ? '...' : userStats.properties}
                </Text>
                <Text style={[styles.statLabel, { color: colors.gray[600] }]}>{t('profile.properties')}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.gray[200] }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {isStatsLoading ? '...' : userStats.reports}
                </Text>
                <Text style={[styles.statLabel, { color: colors.gray[600] }]}>{t('profile.reports')}</Text>
              </View>
            </View>
          </View>
        </FloatingCard>
        {/* Account Actions */}
        <FloatingCard style={styles.section} delay={2500}>
          <Text style={[styles.sectionTitle, { color: colors.gray[700] }]}>{t('settings.account')}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.white, borderColor: colors.gray[200] }]}>
            <SettingItem
              icon="lock"
              title={t('profile.changePassword')}
              subtitle={t('profile.changePasswordSubtitle')}
              onPress={handleChangePassword}
              isFirst={true}
            />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <SettingItem
              icon="attach-email"
              title="Send All Report PDFs"
              subtitle="Email PDFs for all your reports"
              onPress={handleSendAllReportPdfsEmail}
            />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <SettingItem
              icon="dark-mode"
              title={t('settings.darkMode')}
              subtitle={t('settings.darkModeSubtitle')}
              rightComponent={
                <Switch
                  value={isDarkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: colors.gray[300], true: colors.primary }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.gray[300]}
                />
              }
              showArrow={false}
            />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <LanguageSelector />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <SettingItem
              icon="logout"
              title={t('settings.logout')}
              subtitle={t('settings.logoutSubtitle')}
              onPress={handleLogout}
              titleColor={!isDarkMode ? colors.gray[900] : undefined}
              danger={true}
              isLast={true}
            />
          </View>
        </FloatingCard>


        {/* Data Management */}
        {/* <FloatingCard style={styles.section} delay={1500}>
          <Text style={[styles.sectionTitle, { color: colors.gray[700] }]}>{t('settings.dataManagement')}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.white, borderColor: colors.gray[200] }]}>
            <SettingItem
              icon="sync"
              title="Sync Data"
              subtitle="Synchronize with server"
              onPress={handleSyncData}
              isFirst={true}
            />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <SettingItem
              icon="download"
              title={t('settings.exportData')}
              subtitle={t('settings.exportDataSubtitle')}
              onPress={handleExportData}
            />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <SettingItem
              icon="storage"
              title={t('settings.storageUsage')}
              subtitle={t('settings.storageUsageSubtitle')}
              onPress={() => Alert.alert(t('alert.storage'), t('alert.storageMessage'))}
            />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <SettingItem
              icon="delete-sweep"
              title={t('settings.clearCache')}
              subtitle={t('settings.clearCacheSubtitle')}
              onPress={handleClearCache}
              isLast={true}
            />
          </View>
        </FloatingCard> */}

        {/* Support & Legal */}
        <FloatingCard style={styles.section} delay={2000}>
          <Text style={[styles.sectionTitle, { color: colors.gray[700] }]}>{t('settings.supportLegal')}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.white, borderColor: colors.gray[200] }]}>
            <SettingItem
              icon="help"
              title={t('settings.helpSupport')}
              subtitle={t('settings.helpSupportSubtitle')}
              onPress={handleContactSupport}
              isFirst={true}
            />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <SettingItem
              icon="privacy-tip"
              title={t('settings.privacyPolicy')}
              subtitle={t('settings.privacyPolicySubtitle')}
              onPress={handlePrivacyPolicy}
            />
            <View style={[styles.divider, { backgroundColor: colors.gray[100] }]} />
            <SettingItem
              icon="description"
              title={t('settings.termsOfService')}
              subtitle={t('settings.termsOfServiceSubtitle')}
              onPress={handleTermsOfService}
              isLast={true}
            />
          </View>
        </FloatingCard>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.gray[600] }]}>
            {t('settings.appName')}
          </Text>
          <Text style={[styles.footerSubtext, { color: colors.gray[400] }]}>
            {t('settings.appVersion')}
          </Text>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  floatingElement: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.3,
  },
  floatingElement1: {
    width: 100,
    height: 100,
    top: height * 0.1,
    right: 20,
  },
  floatingElement2: {
    width: 60,
    height: 60,
    top: height * 0.2,
    left: 30,
  },
  floatingElement3: {
    width: 80,
    height: 80,
    top: height * 0.15,
    right: width * 0.3,
  },
  headerContainer: {
    paddingTop: 20,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    height: height * 0.4,
    marginBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  profileStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  firstItem: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  lastItem: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dangerIcon: {
    // This will be handled dynamically
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 76,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
  },
});

export default ProfileScreen;