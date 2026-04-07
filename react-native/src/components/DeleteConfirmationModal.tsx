import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface DeleteConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  reportTitle?: string;
  isLoading?: boolean;
}

// Hovering Button Component
interface HoveringButtonProps {
  children: React.ReactNode;
  style?: any;
  onPress: () => void;
  disabled?: boolean;
}

const HoveringButton: React.FC<HoveringButtonProps> = ({ 
  children, 
  style, 
  onPress, 
  disabled = false
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
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
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={disabled ? 1 : 0.8}
        disabled={disabled}
        style={{ flex: 1 }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  title = 'Delete Report',
  message = 'Are you sure you want to delete this report?',
  reportTitle,
  isLoading = false,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { width: screenWidth } = Dimensions.get('window');

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer,
          {
            backgroundColor: colors.white,
            borderColor: colors.gray[200],
            shadowColor: colors.gray[900],
            width: Math.min(screenWidth * 0.9, 400),
          }
        ]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.gray[200] }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.red[50] }]}>
              <Icon name="delete-outline" size={28} color={colors.red[600]} />
            </View>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: colors.gray[900] }]}>
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.gray[600] }]}>
                This action cannot be undone
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={[styles.warningContainer, { backgroundColor: colors.red[50], borderColor: colors.red[100] }]}>
              <Icon name="warning" size={20} color={colors.red[600]} />
              <Text style={[styles.warningText, { color: colors.red[800] }]}>
                {message}
              </Text>
            </View>

            {reportTitle && (
              <View style={[styles.reportInfo, { backgroundColor: colors.gray[50], borderColor: colors.gray[200] }]}>
                <Icon name="description" size={20} color={colors.gray[600]} />
                <Text style={[styles.reportTitle, { color: colors.gray[900] }]}>
                  "{reportTitle}"
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={[styles.footer, { borderTopColor: colors.gray[200], backgroundColor: colors.white }]}>
            <HoveringButton
              style={styles.buttonContainer}
              onPress={onClose}
              disabled={isLoading}
            >
              <View style={[styles.cancelButton, { backgroundColor: colors.gray[100] }]}>
                <Icon name="close" size={20} color={colors.gray[600]} />
                <Text style={[styles.cancelButtonText, { color: colors.gray[700] }]}>
                  Cancel
                </Text>
              </View>
            </HoveringButton>

            <HoveringButton
              style={styles.buttonContainer}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <View style={[
                styles.deleteButton,
                {
                  backgroundColor: isLoading ? colors.gray[300] : colors.red[600],
                }
              ]}>
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={[styles.deleteButtonText, { color: colors.white }]}>
                      Deleting...
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon name="delete" size={20} color={colors.white} />
                    <Text style={[styles.deleteButtonText, { color: colors.white }]}>
                      Delete
                    </Text>
                  </>
                )}
              </View>
            </HoveringButton>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    padding: 24,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  reportTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    gap: 16,
    minHeight: 90,
  },
  buttonContainer: {
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    height: 52,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    height: 52,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeleteConfirmationModal;
