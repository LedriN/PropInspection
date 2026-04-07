import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { offlineService } from '../services/offlineService';

interface NetworkStatusProps {
  onSyncPress?: () => void;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ onSyncPress }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [syncStatus, setSyncStatus] = useState(offlineService.getSyncStatus());
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const unsubscribe = offlineService.addSyncListener((status) => {
      setSyncStatus(status);
      
      // Show banner when offline or when there are pending operations
      const shouldShow = !status.isOnline || status.pendingOperations > 0;
      setIsVisible(shouldShow);
      
      if (shouldShow) {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      } else {
        Animated.spring(slideAnim, {
          toValue: -100,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    });

    return unsubscribe;
  }, [slideAnim]);

  const handleSyncPress = async () => {
    if (onSyncPress) {
      onSyncPress();
    } else {
      await offlineService.forceSync();
    }
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) {
      return colors.error;
    }
    if (syncStatus.pendingOperations > 0) {
      return colors.warning;
    }
    return colors.success;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) {
      return t('network.offline');
    }
    if (syncStatus.pendingOperations > 0) {
      return t('network.pendingSync').replace('{{count}}', syncStatus.pendingOperations.toString());
    }
    return t('network.online');
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) {
      return 'wifi-off';
    }
    if (syncStatus.pendingOperations > 0) {
      return 'sync';
    }
    return 'wifi';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getStatusColor(),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.statusInfo}>
          <Icon
            name={getStatusIcon()}
            size={20}
            color={colors.white}
            style={styles.icon}
          />
          <Text style={[styles.statusText, { color: colors.white }]}>
            {getStatusText()}
          </Text>
        </View>

        {syncStatus.pendingOperations > 0 && syncStatus.isOnline && (
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.white }]}
            onPress={handleSyncPress}
            disabled={syncStatus.isSyncing}
          >
            <Icon
              name={syncStatus.isSyncing ? 'sync' : 'sync'}
              size={16}
              color={getStatusColor()}
              style={syncStatus.isSyncing ? styles.spinning : undefined}
            />
            <Text style={[styles.syncText, { color: getStatusColor() }]}>
              {syncStatus.isSyncing ? t('network.syncing') : t('network.sync')}
            </Text>
          </TouchableOpacity>
        )}

        {syncStatus.lastSyncTime && (
          <Text style={[styles.lastSyncText, { color: colors.white }]}>
            {t('network.lastSync').replace('{{time}}', syncStatus.lastSyncTime.toLocaleTimeString())}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  lastSyncText: {
    fontSize: 10,
    opacity: 0.8,
    marginLeft: 8,
  },
  spinning: {
    // Add rotation animation here if needed
  },
});

export default NetworkStatus;
