import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { offlineService } from '../services/offlineService';

interface OfflineIndicatorProps {
  style?: any;
  showPendingCount?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  style, 
  showPendingCount = true 
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [syncStatus, setSyncStatus] = useState(offlineService.getSyncStatus());

  useEffect(() => {
    const unsubscribe = offlineService.addSyncListener((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  if (syncStatus.isOnline && (!showPendingCount || syncStatus.pendingOperations === 0)) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Icon
        name={syncStatus.isOnline ? 'sync' : 'wifi-off'}
        size={16}
        color={syncStatus.isOnline ? colors.warning : colors.error}
      />
      <Text style={[styles.text, { color: syncStatus.isOnline ? colors.warning : colors.error }]}>
        {syncStatus.isOnline 
          ? (showPendingCount ? `${syncStatus.pendingOperations} ${t('network.pendingSync').split(' ')[1]}` : t('network.syncing'))
          : t('network.offline')
        }
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default OfflineIndicator;
