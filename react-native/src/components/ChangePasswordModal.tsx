import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import PasswordService, { ChangePasswordRequest } from '../services/passwordService';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const passwordService = PasswordService.getInstance();

  const [formData, setFormData] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
  }>({ score: 0, feedback: [] });

  const handleInputChange = (field: keyof ChangePasswordRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Check password strength for new password
    if (field === 'newPassword') {
      const validation = passwordService.validatePassword(value);
      setPasswordStrength({
        score: validation.isValid ? 100 : 0,
        feedback: validation.errors,
      });
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = t('password.currentPasswordRequired');
    }

    if (!formData.newPassword) {
      newErrors.newPassword = t('password.newPasswordRequired');
    } else {
      const passwordValidation = passwordService.validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        newErrors.newPassword = passwordValidation.errors[0];
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('password.confirmPasswordRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('password.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await passwordService.changePassword(formData);
      
      if (response.success) {
        Alert.alert(
          t('common.success'),
          response.message || t('password.passwordChangedSuccessfully'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                handleClose();
                onSuccess?.();
              },
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), response.message || t('password.failedToChangePassword'));
      }
    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('password.unexpectedError')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
    setPasswordStrength({ score: 0, feedback: [] });
    setShowPasswords({ current: false, new: false, confirm: false });
    onClose();
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score === 0) return colors.gray[400];
    if (score < 30) return colors.error;
    if (score < 70) return colors.warning || '#FFA500';
    return colors.success || '#4CAF50';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score === 0) return '';
    if (score < 30) return t('password.weak');
    if (score < 70) return t('password.medium');
    return t('password.strong');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.gray[50] }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.gray[200] }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Icon name="close" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.gray[900] }]}>
            {t('password.title')}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray[700] }]}>
              {t('password.currentPassword')}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.white, borderColor: errors.currentPassword ? colors.error : colors.gray[300] }]}>
              <TextInput
                style={[styles.input, { color: colors.gray[900] }]}
                value={formData.currentPassword}
                onChangeText={(value) => handleInputChange('currentPassword', value)}
                placeholder={t('password.currentPasswordPlaceholder')}
                placeholderTextColor={colors.gray[500]}
                secureTextEntry={!showPasswords.current}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => togglePasswordVisibility('current')}
                style={styles.eyeButton}
              >
                <Icon
                  name={showPasswords.current ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>
            </View>
            {errors.currentPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.currentPassword}
              </Text>
            )}
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray[700] }]}>
              {t('password.newPassword')}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.white, borderColor: errors.newPassword ? colors.error : colors.gray[300] }]}>
              <TextInput
                style={[styles.input, { color: colors.gray[900] }]}
                value={formData.newPassword}
                onChangeText={(value) => handleInputChange('newPassword', value)}
                placeholder={t('password.newPasswordPlaceholder')}
                placeholderTextColor={colors.gray[500]}
                secureTextEntry={!showPasswords.new}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => togglePasswordVisibility('new')}
                style={styles.eyeButton}
              >
                <Icon
                  name={showPasswords.new ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.newPassword}
              </Text>
            )}

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <View style={styles.passwordStrengthContainer}>
                <View style={[styles.passwordStrengthBar, { backgroundColor: colors.gray[200] }]}>
                  <View
                    style={[
                      styles.passwordStrengthFill,
                      {
                        width: `${passwordStrength.score}%`,
                        backgroundColor: getPasswordStrengthColor(passwordStrength.score),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.passwordStrengthText, { color: getPasswordStrengthColor(passwordStrength.score) }]}>
                  {getPasswordStrengthText(passwordStrength.score)}
                </Text>
              </View>
            )}

            {/* Password Requirements */}
            {formData.newPassword && passwordStrength.feedback.length > 0 && (
              <View style={styles.requirementsContainer}>
                <Text style={[styles.requirementsTitle, { color: colors.gray[600] }]}>
                  {t('password.requirements')}
                </Text>
                {passwordStrength.feedback.map((requirement, index) => (
                  <Text key={index} style={[styles.requirementText, { color: colors.gray[500] }]}>
                    • {requirement}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.gray[700] }]}>
              {t('password.confirmPassword')}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.white, borderColor: errors.confirmPassword ? colors.error : colors.gray[300] }]}>
              <TextInput
                style={[styles.input, { color: colors.gray[900] }]}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                placeholder={t('password.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.gray[500]}
                secureTextEntry={!showPasswords.confirm}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => togglePasswordVisibility('confirm')}
                style={styles.eyeButton}
              >
                <Icon
                  name={showPasswords.confirm ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.confirmPassword}
              </Text>
            )}
          </View>

          {/* Security Note */}
          <View style={[styles.securityNote, { backgroundColor: colors.blue[50], borderColor: colors.blue[200] }]}>
            <Icon name="security" size={20} color={colors.primary} />
            <Text style={[styles.securityNoteText, { color: colors.blue[700] }]}>
              {t('password.securityNote')}
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.white, borderTopColor: colors.gray[200] }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.gray[300] }]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: colors.gray[600] }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.white }]}>
                {t('password.changePassword')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 50,
  },
  requirementsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    lineHeight: 16,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangePasswordModal;
