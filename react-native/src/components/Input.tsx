import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  showPassword,
  onTogglePassword,
  style,
  secureTextEntry,
  ...props
}) => {
  const { colors } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const handleTogglePassword = () => {
    if (onTogglePassword) {
      onTogglePassword();
    } else {
      setIsPasswordVisible(!isPasswordVisible);
    }
  };
  
  const shouldShowPassword = showPassword !== undefined ? showPassword : isPasswordVisible;
  const isPasswordField = secureTextEntry || showPassword !== undefined;
  
  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.gray[700] }]}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { 
              borderColor: colors.gray[300], 
              backgroundColor: colors.white,
              color: colors.gray[900]
            },
            error && { borderColor: colors.error },
            isPasswordField && styles.inputWithIcon,
            style,
          ]}
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={isPasswordField && !shouldShowPassword}
          {...props}
        />
        {isPasswordField && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={handleTogglePassword}
            activeOpacity={0.7}
          >
            <Icon
              name={shouldShowPassword ? 'visibility-off' : 'visibility'}
              size={24}
              color={colors.gray[500]}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, { color: colors.gray[500] }]}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: '40%',
    transform: [{ translateY: -12 }],
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;