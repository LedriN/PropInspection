import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface StyledPopupProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // Auto-close duration in milliseconds (0 = no auto-close)
}


const StyledPopup: React.FC<StyledPopupProps> = ({
  isVisible,
  onClose,
  title,
  message,
  type = 'success',
  duration = 1000, // Auto-close after 3 seconds by default
}) => {
  const { colors, isDarkMode } = useTheme();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (isVisible) {
      // Animate in with enhanced effects
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 7,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Auto-close if duration is set
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset animations when not visible
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(-100);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          iconColor: colors.green[600],
          iconBg: colors.green[50],
          borderColor: colors.gray[200],
        };
      case 'error':
        return {
          icon: 'error',
          iconColor: colors.red[600],
          iconBg: colors.red[50],
          borderColor: colors.gray[200],
        };
      case 'warning':
        return {
          icon: 'warning',
          iconColor: colors.yellow[600],
          iconBg: colors.yellow[50],
          borderColor: colors.gray[200],
        };
      case 'info':
        return {
          icon: 'info',
          iconColor: colors.blue[600],
          iconBg: colors.blue[50],
          borderColor: colors.gray[200],
        };
      default:
        return {
          icon: 'check-circle',
          iconColor: colors.green[600],
          iconBg: colors.green[50],
          borderColor: colors.gray[200],
        };
    }
  };

  const typeConfig = getTypeConfig();

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <Animated.View
          style={[
            styles.popupContainer,
            {
              backgroundColor: colors.white,
              borderColor: typeConfig.borderColor,
              shadowColor: colors.gray[900],
              width: Math.min(screenWidth * 0.9, 400), // Responsive width
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
            }
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: typeConfig.iconBg }]}>
            <Icon name={typeConfig.icon} size={24} color={typeConfig.iconColor} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.gray[900] }]}>
              {title}
            </Text>
            <Text style={[styles.message, { color: colors.gray[600] }]}>
              {message}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  popupContainer: {
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    flexDirection: 'row',
    minHeight: 80,
    maxHeight: 120,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'left',
    fontWeight: '500',
    opacity: 0.8,
  },
});

export default StyledPopup;
