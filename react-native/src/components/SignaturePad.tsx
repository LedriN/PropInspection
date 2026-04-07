import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SignatureCanvas from 'react-native-signature-canvas';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

interface SignaturePadProps {
  onSignatureComplete: (signatureData: any) => void;
  onClear: () => void;
  hasSignature: boolean;
  signatureUri?: string;
  label: string;
  subtitle: string;
}


const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureComplete,
  onClear,
  hasSignature,
  signatureUri,
  label,
  subtitle,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const signatureRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignature = (signature: string) => {
    // console.log('Signature captured:', signature);
    // Create signature data for backend upload only - no local storage
    const signatureData = {
      uri: signature, // This will be a data URI for upload
      name: `signature_${Date.now()}.png`,
      type: 'image/png',
      size: 1024
    };
    onSignatureComplete(signatureData);
    setIsLoading(false);
  };

  const handleEmpty = () => {
    console.log('Signature is empty');
    setIsLoading(false);
  };

  const handleClear = () => {
    console.log('Signature cleared');
    onClear();
  };

  const handleError = (error: any) => {
    console.error('Signature pad error:', error);
    setIsLoading(false);
  };

  const handleEnd = () => {
    setIsLoading(true);
    signatureRef.current?.readSignature();
  };

  const style = `.m-signature-pad { box-shadow: none; border: none; } .m-signature-pad--body { border: none; } .m-signature-pad--body canvas { border: none; }`;

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      
      <View style={styles.signatureContainer}>
        {hasSignature && signatureUri && !signatureUri.startsWith('file://') ? (
          <View style={styles.signaturePreview}>
            <View style={styles.signaturePlaceholder}>
              <Image
                source={{ uri: signatureUri }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
              <Text style={styles.signatureCompleteText}>{t('signature.captured')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClear}
              style={[styles.clearButton, { backgroundColor: colors.red[600] }]}
            >
              <Icon name="close" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : hasSignature ? (
          <View style={styles.signaturePreview}>
            <View style={styles.signaturePlaceholder}>
              <Icon name="check-circle" size={48} color={colors.green[600]} />
              <Text style={styles.signatureCompleteText}>{t('signature.captured')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClear}
              style={[styles.clearButton, { backgroundColor: colors.red[600] }]}
            >
              <Icon name="close" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.signaturePad}>
            <SignatureCanvas
              ref={signatureRef}
              onEnd={handleEnd}
              onOK={handleSignature}
              onEmpty={handleEmpty}
              onClear={handleClear}
              onError={handleError}
              autoClear={false}
              descriptionText={t('signature.signHere')}
              clearText={t('signature.clear')}
              confirmText={isLoading ? t('signature.processing') : t('signature.save')}
              penColor={'black'}
              // backgroundColor="rgba(255,255,255,1)"
              style={style}
              webviewProps={{
                cacheEnabled: true,
                androidLayerType: "hardware",
                injectedJavaScript: `
                  const style = document.createElement('style');
                  style.textContent = '.m-signature-pad { box-shadow: none !important; border: none !important; } .m-signature-pad--body { border: none !important; } .m-signature-pad--body canvas { border: none !important; }';
                  document.head.appendChild(style);
                `,
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray[500],
    marginBottom: 12,
  },
  signatureContainer: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    backgroundColor: colors.white,
    // height: 250,
    // overflow: 'hidden',
  },
  signaturePad: {
    // width: width * 0.8, // 80% of screen width
    minHeight: 300, // Minimum height to ensure visibility
    // height: Math.max(width * 0.4, 300), // Use larger of responsive height or 300px
    // alignSelf: 'center',
    // flex: 1,
    // height: 250,
  },
  signaturePreview: {
  //   flex: 1,
  //   position: 'relative',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  },
  signaturePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureCompleteText: {
    fontSize: 16,
    color: colors.green[600],
    fontWeight: '500',
    // marginBottom:60,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  signatureImage: {
    width: width * 0.8, // 80% of screen width - same as SignatureCanvas
    minHeight: 300, // Minimum height to ensure visibility
    alignSelf: 'center',
    // height: Math.max(width * 0.4, 300), // Use larger of responsive height or 300px
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SignaturePad;
