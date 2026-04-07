import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface EmailConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  subtitle?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
  isLoading?: boolean;
  agentEmail?: string;
  clientEmail?: string;
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

const ConfirmationModal: React.FC<EmailConfirmationModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  title,
  subtitle,
  primaryActionText,
  secondaryActionText,
  isLoading = false,
  agentEmail,
  clientEmail,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  // Default values using translations
  const defaultTitle = title || t('reports.confirmAction');
  const defaultSubtitle = subtitle || t('reports.confirmActionSubtitle');
  const defaultPrimaryAction = primaryActionText || t('common.confirm');
  const defaultSecondaryAction = secondaryActionText || t('common.cancel');

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
          }
        ]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.gray[200] }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.blue[50] }]}>
              <Icon name="info" size={24} color={colors.blue[600]} />
            </View>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: colors.gray[900] }]}>
                {defaultTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.gray[600] }]}>
                {defaultSubtitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          {/* Content - Scrollable Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.contentSection}>
              <Text style={[styles.sectionTitle, { color: colors.gray[900] }]}>
                {t('reports.emailRecipients')}
              </Text>
              
              {/* Agent Email */}
              <View style={[styles.emailItem, { backgroundColor: colors.gray[50], borderColor: colors.gray[200] }]}>
                <View style={[styles.emailIcon, { backgroundColor: colors.blue[100] }]}>
                  <Icon name="person" size={20} color={colors.blue[600]} />
                </View>
                <View style={styles.emailInfo}>
                  <Text style={[styles.emailLabel, { color: colors.gray[600] }]}>
                    {t('reports.agentEmailLabel')}
                  </Text>
                  <Text style={[styles.emailAddress, { color: colors.gray[900] }]}>
                    {agentEmail || t('reports.noEmailAvailable')}
                  </Text>
                </View>
              </View>

              {/* Client Email */}
              <View style={[styles.emailItem, { backgroundColor: colors.gray[50], borderColor: colors.gray[200] }]}>
                <View style={[styles.emailIcon, { backgroundColor: colors.green[100] }]}>
                  <Icon name="person-pin" size={20} color={colors.green[600]} />
                </View>
                <View style={styles.emailInfo}>
                  <Text style={[styles.emailLabel, { color: colors.gray[600] }]}>
                    {t('reports.clientEmailLabel')}
                  </Text>
                  <Text style={[styles.emailAddress, { color: colors.gray[900] }]}>
                    {clientEmail || t('reports.noEmailAvailable')}
                  </Text>
                </View>
              </View>

              {/* Warning Message */}
              <View style={[styles.warningContainer, { backgroundColor: colors.yellow[50], borderColor: colors.yellow[100] }]}>
                <Icon name="warning" size={20} color={colors.yellow[600]} />
                <Text style={[styles.warningText, { color: colors.yellow[800] }]}>
                  {t('reports.emailWarningMessage')}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.footer, { borderTopColor: colors.gray[200], backgroundColor: colors.white }]}>
            <HoveringButton
              style={styles.buttonContainer}
              onPress={onClose}
              disabled={isLoading}
            >
              <View style={[styles.cancelButton, { backgroundColor: colors.gray[100] }]}>
                <Text style={[styles.cancelButtonText, { color: colors.gray[700] }]}>
                  {defaultSecondaryAction}
                </Text>
              </View>
            </HoveringButton>

            <HoveringButton
              style={styles.buttonContainer}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <View style={[
                styles.confirmButton,
                {
                  backgroundColor: isLoading ? colors.gray[300] : colors.green[600],
                }
              ]}>
                {isLoading ? (
                  <>
                    <Icon name="hourglass-empty" size={20} color={colors.white} />
                    <Text style={[styles.confirmButtonText, { color: colors.white }]}>
                      {t('reports.processing')}
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={20} color={colors.white} />
                    <Text style={[styles.confirmButtonText, { color: colors.white }]}>
                      {defaultPrimaryAction}
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
    width: '100%',
    maxWidth: 400,
    height: '85%',
    maxHeight: '85%',
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
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  contentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  emailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emailInfo: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailAddress: {
    fontSize: 17,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
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
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    height: 52,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConfirmationModal;
