import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import Button from '../components/Button';
import Input from '../components/Input';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert(t('login.error'), t('login.fillFields'));
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      // Show specific error message from backend
      const errorMessage = err?.message || t('login.tryAgain');
      Alert.alert(t('login.failed'), errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.gray[50] }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Icon name="business" size={32} color={colors.white} />
          </View>
          <Text style={[styles.title, { color: colors.gray[900] }]}>{t('login.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.gray[600] }]}>{t('login.subtitle')}</Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.white }]}>
          <Input
            label={t('login.email')}
            placeholder={t('login.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Input
            label={t('login.password')}
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Button
            title={t('login.signIn')}
            onPress={handleSubmit}
            fullWidth
            size="lg"
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  demo: {
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  demoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    width: '100%',
  },
  demoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  demoBold: {
    fontWeight: '600',
  },
  demoHint: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default LoginScreen;