import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage, Language } from '../contexts/LanguageContext';

interface LanguageOption {
  code: Language;
  name: string;
  icon: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', icon: 'public' },
  { code: 'alb', name: 'Albanian', icon: 'flag' },
  { code: 'de', name: 'German', icon: 'flag' },
];

interface LanguageSelectorProps {
  onLanguageChange?: (language: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onLanguageChange }) => {
  const { colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === language);
  
  const getLanguageFlag = (code: Language) => {
    switch (code) {
      case 'en':
        return '🇬🇧';
      case 'alb':
        return '🇦🇱';
      case 'de':
        return '🇩🇪';
      default:
        return '🌐';
    }
  };
  
  const getLanguageName = (code: string) => {
    switch (code) {
      case 'en': return t('language.english');
      case 'alb': return t('language.albanian');
      case 'de': return t('language.german');
      default: return 'English';
    }
  };

  const handleLanguageSelect = (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    setIsModalVisible(false);
    onLanguageChange?.(selectedLanguage);
  };

  const renderLanguageItem = ({ item }: { item: LanguageOption }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        { 
          backgroundColor: colors.white,
          borderBottomColor: colors.gray[100]
        }
      ]}
      onPress={() => handleLanguageSelect(item.code)}
    >
      <View style={styles.languageItemLeft}>
        <Text style={[styles.flagEmoji, { color: colors.gray[900] }]}>
          {getLanguageFlag(item.code)}
        </Text>
        <Text style={[styles.languageName, { color: colors.gray[900] }]}>
          {getLanguageName(item.code)}
        </Text>
      </View>
      {language === item.code && (
        <Icon name="check" size={24} color={colors.icon} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.white }]}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.blue[50] }]}>
            <Icon name="language" size={24} color={colors.icon} />
          </View>
          <View style={styles.selectorText}>
            <Text style={[styles.selectorTitle, { color: colors.gray[900] }]}>
              {t('settings.language')}
            </Text>
            <Text style={[styles.selectorSubtitle, { color: colors.gray[600] }]}>
              {currentLanguage ? getLanguageName(currentLanguage.code) : 'English'}
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color={colors.icon} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.gray[50] }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.white, borderBottomColor: colors.gray[200] }]}>
            <Text style={[styles.modalTitle, { color: colors.gray[900] }]}>
              {t('settings.language')}
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={languages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            style={styles.languageList}
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  selectorText: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  selectorSubtitle: {
    fontSize: 14,
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
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  languageItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagIcon: {
    marginRight: 16,
  },
  flagEmoji: {
    fontSize: 22,
    marginRight: 16,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LanguageSelector;
