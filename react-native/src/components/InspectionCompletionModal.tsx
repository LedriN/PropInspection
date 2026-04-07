import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import ApiClient, { ApiError } from '../config/api';
import { offlineApiService } from '../services/offlineApiService';
import { syncService } from '../services/syncService';
import SignaturePad from './SignaturePad';

const { width, height } = Dimensions.get('window');

interface InspectionCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInspectionCompleted: () => void;
  inspection: any;
}

interface InspectionField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'number' | 'image';
  options?: string[];
  required?: boolean;
  allowMultiple?: boolean;
}

interface InspectionArea {
  id: string;
  name: string;
  icon: string;
  fields: InspectionField[];
}

interface Signature {
  uri: string;
  name: string;
  type: string;
  size: number;
}

// Function to get translated inspection areas
const getInspectionAreas = (t: (key: string) => string): InspectionArea[] => [
  {
    id: 'exterior',
    name: t('inspection.exterior'),
    icon: 'home',
    fields: [
      { id: 'roof_condition', label: t('inspection.roofCondition'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsReplacement')], required: true },
      { id: 'roof_images', label: t('inspection.roofImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'siding_condition', label: t('inspection.sidingCondition'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsReplacement')], required: true },
      { id: 'siding_images', label: t('inspection.sidingImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'windows_doors', label: t('inspection.windowsDoors'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsReplacement')], required: true },
      { id: 'windows_images', label: t('inspection.windowsImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'foundation', label: t('inspection.foundation'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsReplacement')], required: true },
      { id: 'foundation_images', label: t('inspection.foundationImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'exterior_notes', label: t('inspection.exteriorNotes'), type: 'textarea', required: false }
    ]
  },
  {
    id: 'interior',
    name: t('inspection.interior'),
    icon: 'room',
    fields: [
      { id: 'walls_condition', label: t('inspection.wallsCondition'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'walls_images', label: t('inspection.wallsImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'floors_condition', label: t('inspection.floorsCondition'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'floors_images', label: t('inspection.floorsImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'ceilings_condition', label: t('inspection.ceilingsCondition'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'ceilings_images', label: t('inspection.ceilingsImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'interior_notes', label: t('inspection.interiorNotes'), type: 'textarea', required: false }
    ]
  },
  {
    id: 'electrical',
    name: t('inspection.electrical'),
    icon: 'electrical-services',
    fields: [
      { id: 'electrical_system', label: t('inspection.electricalSystem'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsUpgrade')], required: true },
      { id: 'electrical_system_images', label: t('inspection.electricalSystemImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'outlets_switches', label: t('inspection.outletsSwitches'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'outlets_images', label: t('inspection.outletsImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'lighting', label: t('inspection.lighting'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'lighting_images', label: t('inspection.lightingImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'electrical_notes', label: t('inspection.electricalNotes'), type: 'textarea', required: false }
    ]
  },
  {
    id: 'plumbing',
    name: t('inspection.plumbing'),
    icon: 'plumbing',
    fields: [
      { id: 'water_supply', label: t('inspection.waterSupply'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'water_supply_images', label: t('inspection.waterSupplyImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'drainage', label: t('inspection.drainage'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'drainage_images', label: t('inspection.drainageImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'fixtures', label: t('inspection.fixtures'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'fixtures_images', label: t('inspection.fixturesImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'plumbing_notes', label: t('inspection.plumbingNotes'), type: 'textarea', required: false }
    ]
  },
  {
    id: 'hvac',
    name: t('inspection.hvac'),
    icon: 'ac-unit',
    fields: [
      { id: 'heating_system', label: t('inspection.heatingSystem'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsReplacement')], required: true },
      { id: 'heating_system_images', label: t('inspection.heatingSystemImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'cooling_system', label: t('inspection.coolingSystem'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsReplacement')], required: true },
      { id: 'cooling_system_images', label: t('inspection.coolingSystemImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'ventilation', label: t('inspection.ventilation'), type: 'select', options: [t('inspection.none'), t('inspection.excellent'), t('inspection.good'), t('inspection.fair'), t('inspection.poor'), t('inspection.needsRepair')], required: true },
      { id: 'ventilation_images', label: t('inspection.ventilationImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'hvac_notes', label: t('inspection.hvacNotes'), type: 'textarea', required: false }
    ]
  },
  {
    id: 'safety',
    name: t('inspection.safety'),
    icon: 'security',
    fields: [
      { id: 'smoke_detectors', label: t('inspection.smokeDetectors'), type: 'select', options: [t('inspection.none'), t('inspection.presentWorking'), t('inspection.presentNeedsBattery'), t('inspection.missing'), t('inspection.notTested')], required: true },
      { id: 'smoke_detectors_images', label: t('inspection.smokeDetectorsImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'carbon_monoxide', label: t('inspection.carbonMonoxide'), type: 'select', options: [t('inspection.none'), t('inspection.presentWorking'), t('inspection.presentNeedsBattery'), t('inspection.missing'), t('inspection.notTested')], required: true },
      { id: 'carbon_monoxide_images', label: t('inspection.carbonMonoxideImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'fire_extinguisher', label: t('inspection.fireExtinguisher'), type: 'select', options: [t('inspection.none'), t('inspection.presentCurrent'), t('inspection.presentExpired'), t('inspection.missing')], required: true },
      { id: 'fire_extinguisher_images', label: t('inspection.fireExtinguisherImages'), type: 'image', allowMultiple: true, required: false },
      { id: 'safety_notes', label: t('inspection.safetyNotes'), type: 'textarea', required: false }
    ]
  }
];

const InspectionCompletionModal: React.FC<InspectionCompletionModalProps> = ({
  isOpen,
  onClose,
  onInspectionCompleted,
  inspection,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const stepScrollViewRef = useRef<ScrollView>(null);
  
  // Get translated inspection areas
  const inspectionAreas = getInspectionAreas(t);
  
  // Create styles with theme colors
  const styles = createStyles(colors);
  
  // Form data
  const [formData, setFormData] = useState(() => {
    return {
      // Step 1: Property Details (pre-filled from inspection)
      propertyName: inspection?.property_name || inspection?.property || '',
      propertyAddress: inspection?.property_name || inspection?.property || '',
      propertyType: inspection?.property_type || '',
      propertySize: inspection?.property_size || '',
      
      // Step 2: Client & Agent Details (pre-filled from inspection)
      clientName: inspection?.client_name || inspection?.client || '',
      clientEmail: inspection?.client_email || inspection?.clientEmail || '',
      clientPhone: inspection?.client_phone || inspection?.clientPhone || '',
      clientAddress: inspection?.client_address || inspection?.clientAddress || '',
      agentName: inspection?.inspector_name || inspection?.agent || '',
      agentEmail: inspection?.inspector_email || inspection?.agentEmail || '',
      agentPhone: inspection?.inspector_phone || inspection?.agentPhone || '',
      
      // Step 3: Inspection Summary
      summary: inspection?.summary || '',
      
      // Step 4+: Inspection Areas
      inspectionData: {} as Record<string, Record<string, any>>,
      
      // Security Deposit Step
      securityDeposit: {
        amount: '',
        currency: 'CHF',
        paymentMethod: '',
        notes: ''
      },
      
      // Final Step: Signatures
      agentSignature: null as Signature | null,
      clientSignature: null as Signature | null
    };
  });

  const totalSteps = 3 + inspectionAreas.length + 3; // +3 for security deposit + separate agent and client signature steps

  // Update form data when inspection prop changes
  useEffect(() => {
    if (inspection) {
      console.log('InspectionCompletionModal - Received inspection data:', inspection);
      console.log('=== INSPECTION DATA ANALYSIS ===');
      console.log('Inspection ID:', inspection.id);
      console.log('Property name:', inspection?.property_name || inspection?.property);
      console.log('Client name:', inspection?.client_name || inspection?.client);
      console.log('Agent name:', inspection?.inspector_name || inspection?.agent);
      console.log('Property ID:', inspection?.propertyId || inspection?.property_id);
      console.log('Client ID:', inspection?.clientId || inspection?.client_id);
      console.log('Agent ID:', inspection?.agentId || inspection?.agent_id);
      console.log('All inspection keys:', Object.keys(inspection));
      
      setFormData({
        propertyName: inspection?.property_name || inspection?.property || '',
        propertyAddress: inspection?.property_name || inspection?.property || '',
        propertyType: inspection?.property_type || '',
        propertySize: inspection?.property_size || '',
        clientName: inspection?.client_name || inspection?.client || '',
        clientEmail: inspection?.client_email || inspection?.clientEmail || '',
        clientPhone: inspection?.client_phone || inspection?.clientPhone || '',
        clientAddress: inspection?.client_address || inspection?.clientAddress || '',
        agentName: inspection?.inspector_name || inspection?.agent || '',
        agentEmail: inspection?.inspector_email || inspection?.agentEmail || '',
        agentPhone: inspection?.inspector_phone || inspection?.agentPhone || '',
        summary: inspection?.summary || '',
        inspectionData: {},
        securityDeposit: {
          amount: '',
          currency: 'CHF',
          paymentMethod: '',
          notes: ''
        },
        agentSignature: null,
        clientSignature: null
      });
    }
  }, [inspection]);

  // Scroll to top when step changes
  useEffect(() => {
    if (isOpen && currentStep > 1) {
      // Use a longer timeout to ensure the new content is fully rendered
      setTimeout(() => {
        console.log('Scrolling to top - currentStep:', currentStep);
        console.log('scrollViewRef.current:', scrollViewRef.current);
        console.log('stepScrollViewRef.current:', stepScrollViewRef.current);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        stepScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 200);
    }
  }, [currentStep, isOpen]);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInspectionFieldChange = (areaId: string, fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      inspectionData: {
        ...prev.inspectionData,
        [areaId]: {
          ...(prev.inspectionData[areaId] || {}),
          [fieldId]: value
        }
      }
    }));
  };

  const handleSecurityDepositChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      securityDeposit: {
        ...prev.securityDeposit,
        [field]: value
      }
    }));
  };

  // Image picker functions
  const requestPermissions = async () => {
    try {
      // Request both camera and media library permissions
      const [cameraStatus, mediaLibraryStatus] = await Promise.all([
        ImagePicker.requestCameraPermissionsAsync(),
        ImagePicker.requestMediaLibraryPermissionsAsync()
      ]);
      
      console.log('Permission status:', { camera: cameraStatus.status, mediaLibrary: mediaLibraryStatus.status });
      
      if (cameraStatus.status !== 'granted' || mediaLibraryStatus.status !== 'granted') {
        Alert.alert(
          t('common.error'), 
          'Camera and photo library permissions are required to take and select photos. Please enable them in Settings.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert(t('common.error'), 'Failed to request permissions');
      return false;
    }
  };

  const pickImage = async (areaId: string, fieldId: string) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      t('inspectionCompletion.selectImageSource'),
      t('inspectionCompletion.chooseImageSource'),
      [
        {
          text: t('inspectionCompletion.camera'),
          onPress: async () => {
            // Check camera permission specifically before opening camera
            const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
            if (cameraPermission.status !== 'granted') {
              Alert.alert(t('common.error'), t('inspectionCompletion.cameraPermissionDenied'));
              return;
            }
            openCamera(areaId, fieldId);
          },
        },
        {
          text: t('inspectionCompletion.gallery'),
          onPress: async () => {
            // Check media library permission specifically before opening gallery
            const mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (mediaPermission.status !== 'granted') {
              Alert.alert(t('common.error'), t('inspectionCompletion.cameraPermissionDenied'));
              return;
            }
            openGallery(areaId, fieldId);
          },
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async (areaId: string, fieldId: string) => {
    try {
      console.log('Opening camera for area:', areaId, 'field:', fieldId);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('Camera result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Adding image from camera:', result.assets[0]);
        addImageToField(areaId, fieldId, result.assets[0]);
      } else {
        console.log('Camera was canceled or no assets');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(t('common.error'), 'Failed to open camera. Please check permissions.');
    }
  };

  const openGallery = async (areaId: string, fieldId: string) => {
    try {
      console.log('Opening gallery for area:', areaId, 'field:', fieldId);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      console.log('Gallery result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Adding images from gallery:', result.assets);
        result.assets.forEach(asset => {
          addImageToField(areaId, fieldId, asset);
        });
      } else {
        console.log('Gallery was canceled or no assets');
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert(t('common.error'), 'Failed to open gallery. Please check permissions.');
    }
  };

  const addImageToField = (areaId: string, fieldId: string, imageAsset: any) => {
    const currentImages = formData.inspectionData[areaId]?.[fieldId] || [];
    const newImage = {
      uri: imageAsset.uri,
      name: imageAsset.fileName || `image_${Date.now()}.jpg`,
      type: 'image/jpeg',
      size: imageAsset.fileSize || 0,
      width: imageAsset.width,
      height: imageAsset.height,
    };

    setFormData(prev => ({
      ...prev,
      inspectionData: {
        ...prev.inspectionData,
        [areaId]: {
          ...(prev.inspectionData[areaId] || {}),
          [fieldId]: [...currentImages, newImage]
        }
      }
    }));
  };

  const removeImageFromField = (areaId: string, fieldId: string, imageIndex: number) => {
    const currentImages = formData.inspectionData[areaId]?.[fieldId] || [];
    const updatedImages = currentImages.filter((_: any, index: number) => index !== imageIndex);

    setFormData(prev => ({
      ...prev,
      inspectionData: {
        ...prev.inspectionData,
        [areaId]: {
          ...(prev.inspectionData[areaId] || {}),
          [fieldId]: updatedImages
        }
      }
    }));
  };

  const clearSignature = (signatureType: 'agent' | 'client') => {
    setFormData(prev => ({
      ...prev,
      [`${signatureType}Signature`]: null
    }));
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 3) {
      if (!formData.summary || formData.summary.trim() === '') {
        Alert.alert(t('inspectionCompletion.validationError'), t('inspectionCompletion.enterSummaryFirst'));
        return;
      }
    } else if (currentStep > 3 && currentStep < totalSteps - 2) {
      // For inspection steps, no validation required - allow navigation without selecting options
      // Users can move to next steps even without filling any fields
    } else if (currentStep === totalSteps - 2) {
      // Security deposit step validation
      if (!formData.securityDeposit.amount || formData.securityDeposit.amount.trim() === '') {
        Alert.alert(
          t('inspectionCompletion.validationError'),
          'Please enter the security deposit amount'
        );
        return;
      }
    } else if (currentStep === totalSteps - 1) {
      // Agent signature step validation
      if (!formData.agentSignature) {
        Alert.alert(
          t('inspectionCompletion.validationError'),
          t('signature.missingAgentSignature')
        );
        return;
      }
    } else if (currentStep === totalSteps) {
      // Client signature step validation
      if (!formData.clientSignature) {
        Alert.alert(
          t('inspectionCompletion.validationError'),
          t('signature.missingClientSignature')
        );
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      // Scroll to top when moving to next step
      setTimeout(() => {
        console.log('nextStep - Scrolling to top');
        console.log('scrollViewRef.current:', scrollViewRef.current);
        console.log('stepScrollViewRef.current:', stepScrollViewRef.current);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        stepScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Scroll to top when moving to previous step
      setTimeout(() => {
        console.log('prevStep - Scrolling to top');
        console.log('scrollViewRef.current:', scrollViewRef.current);
        console.log('stepScrollViewRef.current:', stepScrollViewRef.current);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        stepScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  // Helper function to check if current step is valid
  const isCurrentStepValid = () => {
    if (currentStep === 3) {
      return formData.summary && formData.summary.trim() !== '';
    } else if (currentStep > 3 && currentStep < totalSteps - 2) {
      // For inspection steps, always allow navigation - no validation required
      return true;
    } else if (currentStep === totalSteps - 2) {
      // Security deposit step validation
      return formData.securityDeposit.amount && formData.securityDeposit.amount.trim() !== '';
    } else if (currentStep === totalSteps - 1) {
      // Agent signature step validation
      return formData.agentSignature;
    } else if (currentStep === totalSteps) {
      // Client signature step validation
      return formData.clientSignature;
    }
    return true; // Steps 1 and 2 are always valid (display only)
  };

  // Helper function to check if all required fields are completed for submission
  const isAllRequiredFieldsCompleted = () => {
    // Check summary
    if (!formData.summary || formData.summary.trim() === '') {
      return false;
    }

    // Check security deposit
    if (!formData.securityDeposit.amount || formData.securityDeposit.amount.trim() === '') {
      return false;
    }

    // No validation required for inspection fields - users can submit without filling them
    // Only check signatures if we're on the signature step or later
    if (currentStep >= totalSteps) {
      if (!formData.agentSignature || !formData.clientSignature) {
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    // Process images and create completion data
    const processedImages: any = {};
    const findings: any[] = [];

    Object.keys(formData.inspectionData || {}).forEach(area => {
      const areaData = formData.inspectionData[area];
      processedImages[area] = {};
      
      Object.keys(areaData || {}).forEach(field => {
        const fieldValue = areaData[field];
        
        // Handle image fields
        if (Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0].uri) {
          processedImages[area][field] = fieldValue;
        } else if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
          // Handle text/select fields
          findings.push({
            category: area,
            description: `${field}: ${fieldValue}`,
            severity: 'medium' // Default severity
          });
        }
      });
    });

    const completionData = {
      summary: formData.summary,
      findings: findings,
      recommendations: formData.summary ? [formData.summary] : [],
      completedAt: new Date(),
      images: processedImages,
      securityDeposit: formData.securityDeposit,
      // Signatures will be uploaded separately and processed by backend
      signatures: {}
    };

    try {
      // Validate required fields
      if (!formData.summary || formData.summary.trim() === '') {
        Alert.alert(t('inspectionCompletion.validationError'), t('inspectionCompletion.completeSummaryBeforeSubmit'));
        return;
      }

      setLoading(true);

      console.log('=== CLIENT: COMPLETING INSPECTION ===');
      console.log('Inspection ID:', inspection.id);
      console.log('Completion data:', completionData);

      // Mark inspection as completed - the server will automatically create a report
      console.log('Marking inspection as completed...');
      
      // Create multipart form data for signature uploads and inspection data
      const multipartFormData = new FormData();
      
      // Add completion data fields
      multipartFormData.append('summary', completionData.summary);
      multipartFormData.append('findings', JSON.stringify(completionData.findings));
      multipartFormData.append('recommendations', JSON.stringify(completionData.recommendations));
      multipartFormData.append('completedAt', completionData.completedAt.toISOString());
      multipartFormData.append('inspectionData', JSON.stringify(formData.inspectionData));
      multipartFormData.append('images', JSON.stringify(completionData.images));
      multipartFormData.append('securityDeposit', JSON.stringify(completionData.securityDeposit));
      
      // Add signatures as files
      if (formData.agentSignature) {
        console.log('Adding agent signature to form data');
        multipartFormData.append('agentSignature', formData.agentSignature as any);
      }
      if (formData.clientSignature) {
        console.log('Adding client signature to form data');
        multipartFormData.append('clientSignature', formData.clientSignature as any);
      }
      
      const inspectionResponse = await ApiClient.getInstance().patch(`/inspections/${inspection.id}/complete`, multipartFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Inspection completion response:', inspectionResponse);

      // Success - the server automatically creates a report when inspection is completed      
      // Add a small delay to ensure server has processed the update
      setTimeout(() => {
        onInspectionCompleted();
        onClose();
        resetForm();
      }, 500);
    } catch (error) {
      console.error('=== CLIENT: ERROR COMPLETING INSPECTION ===');
      console.error('Error object:', error);
      console.error('Error message:', (error as Error).message);
      console.error('Error response:', (error as any).response?.data);
      console.error('Error status:', (error as any).response?.status);
      
      // Provide more specific error messages based on the error type
      let errorMessage = t('inspectionCompletion.failedToComplete');
      let errorTitle = t('common.error');
      
      // Check error status - support both ApiError (status property) and axios-style (response.status)
      const errorStatus = error instanceof ApiError 
        ? error.status 
        : (error as any).response?.status;
      
      if (errorStatus === 404) {
        errorTitle = 'Inspection Not Found';
        errorMessage = 'The inspection could not be found. Please refresh the inspection list and try again.';
      } else if (errorStatus === 500) {
        errorTitle = 'Server Error';
        errorMessage = 'There was a server error while completing the inspection. Please try again or contact support.';
      } else if (errorStatus === 401) {
        // Note: User has already been logged out automatically by API client
        errorTitle = 'Authentication Error';
        errorMessage = 'Your session has expired. You have been logged out. Please log in again and try completing the inspection.';
      } else if ((error as Error).message.includes('Network')) {
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if ((error as Error).message) {
        errorMessage = (error as Error).message;
      }
      
      // Show error without local storage fallback
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      propertyName: inspection?.property_name || inspection?.property || '',
      propertyAddress: inspection?.property_name || inspection?.property || '',
      propertyType: inspection?.property_type || '',
      propertySize: inspection?.property_size || '',
      clientName: inspection?.client_name || inspection?.client || '',
      clientEmail: inspection?.client_email || inspection?.clientEmail || '',
      clientPhone: inspection?.client_phone || inspection?.clientPhone || '',
      clientAddress: inspection?.client_address || inspection?.clientAddress || '',
      agentName: inspection?.inspector_name || inspection?.agent || '',
      agentEmail: inspection?.inspector_email || inspection?.agentEmail || '',
      agentPhone: inspection?.inspector_phone || inspection?.agentPhone || '',
      summary: inspection?.summary || '',
      inspectionData: {},
      securityDeposit: {
        amount: '',
        currency: 'CHF',
        paymentMethod: '',
        notes: ''
      },
      agentSignature: null,
      clientSignature: null
    });
  };

  const getStepTitle = () => {
    if (currentStep === 1) return t('inspectionCompletion.propertyDetails');
    if (currentStep === 2) return t('inspectionCompletion.peopleInvolved');
    if (currentStep === 3) return t('inspectionCompletion.inspectionSummary');
    if (currentStep === totalSteps - 2) return 'Security Deposit';
    if (currentStep === totalSteps - 1) return t('signature.agentSignature');
    if (currentStep === totalSteps) return t('signature.clientSignature');
    const areaIndex = currentStep - 4;
    return inspectionAreas[areaIndex]?.name || t('inspectionCompletion.inspection');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name="home" size={24} color={colors.primary} />
              <Text style={styles.stepTitle}>{t('inspectionCompletion.propertyDetails')}</Text>
            </View>
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('inspectionCompletion.property')}:</Text>
                <Text style={styles.infoValue}>{formData.propertyName || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('inspectionCompletion.address')}:</Text>
                <Text style={styles.infoValue}>{formData.propertyAddress || 'N/A'}</Text>
              </View>
              {formData.propertyType && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('inspectionCompletion.type')}:</Text>
                  <Text style={styles.infoValue}>{formData.propertyType}</Text>
                </View>
              )}
              {formData.propertySize && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('inspectionCompletion.size')}:</Text>
                  <Text style={styles.infoValue}>{formData.propertySize}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name="person" size={24} color={colors.primary} />
              <Text style={styles.stepTitle}>{t('inspectionCompletion.peopleInvolved')}</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>{t('inspectionCompletion.client')}</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('inspectionCompletion.name')}:</Text>
                <Text style={styles.infoValue}>{formData.clientName || 'N/A'}</Text>
              </View>
              {formData.clientEmail && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('inspectionCompletion.email')}:</Text>
                  <Text style={styles.infoValue}>{formData.clientEmail}</Text>
                </View>
              )}
              {formData.clientPhone && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('inspectionCompletion.phone')}:</Text>
                  <Text style={styles.infoValue}>{formData.clientPhone}</Text>
                </View>
              )}
              {formData.clientAddress && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('inspectionCompletion.address')}:</Text>
                  <Text style={styles.infoValue}>{formData.clientAddress}</Text>
                </View>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>{t('inspectionCompletion.agent')}</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('inspectionCompletion.name')}:</Text>
                <Text style={styles.infoValue}>{formData.agentName || 'N/A'}</Text>
              </View>
              {formData.agentEmail && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('inspectionCompletion.email')}:</Text>
                  <Text style={styles.infoValue}>{formData.agentEmail}</Text>
                </View>
              )}
              {formData.agentPhone && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('inspectionCompletion.phone')}:</Text>
                  <Text style={styles.infoValue}>{formData.agentPhone}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name="description" size={24} color={colors.primary} />
              <Text style={styles.stepTitle}>{t('inspectionCompletion.inspectionSummary')}</Text>
            </View>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('inspectionCompletion.summary')} *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.summary}
                onChangeText={(value) => handleInputChange('summary', value)}
                placeholder={t('inspectionCompletion.summaryPlaceholder')}
                placeholderTextColor={colors.gray[500]}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );

      case totalSteps - 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name="account-balance-wallet" size={24} color={colors.primary} />
              <Text style={styles.stepTitle}>Security Deposit</Text>
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Deposit Amount *</Text>
              <View style={styles.currencyInputContainer}>
                <View style={styles.currencySelector}>
                  <TouchableOpacity
                    style={[
                      styles.currencyButton, 
                      { borderColor: colors.gray[200] },
                      formData.securityDeposit.currency === 'CHF' && styles.currencyButtonActive
                    ]}
                    onPress={() => handleSecurityDepositChange('currency', 'CHF')}
                  >
                    <Text style={[
                      styles.currencyText,
                      formData.securityDeposit.currency === 'CHF' && styles.currencyTextActive
                    ]}>
                      CHF
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.currencyButton, 
                      { borderColor: colors.gray[200] },
                      formData.securityDeposit.currency === 'EUR' && styles.currencyButtonActive
                    ]}
                    onPress={() => handleSecurityDepositChange('currency', 'EUR')}
                  >
                    <Text style={[
                      styles.currencyText,
                      formData.securityDeposit.currency === 'EUR' && styles.currencyTextActive
                    ]}>
                      EUR
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.textInput, styles.currencyInput]}
                  value={formData.securityDeposit.amount}
                  onChangeText={(value) => handleSecurityDepositChange('amount', value)}
                  placeholder="0.00"
                  placeholderTextColor={colors.gray[500]}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.paymentMethodContainer}>
                {['Cash', 'Bank Transfer', 'Check', 'Credit Card'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    onPress={() => handleSecurityDepositChange('paymentMethod', method)}
                    style={[
                      styles.paymentMethodOption,
                      { borderColor: colors.gray[200] },
                      formData.securityDeposit.paymentMethod === method && styles.paymentMethodOptionActive
                    ]}
                  >
                    <Text style={[
                      styles.paymentMethodText,
                      formData.securityDeposit.paymentMethod === method && styles.paymentMethodTextActive
                    ]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Additional Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.securityDeposit.notes}
                onChangeText={(value) => handleSecurityDepositChange('notes', value)}
                placeholder="Any additional information about the security deposit..."
                placeholderTextColor={colors.gray[500]}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        );

      case totalSteps - 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name="edit" size={24} color={colors.primary} />
              <Text style={styles.stepTitle}>{t('signature.agentSignature')}</Text>
            </View>
            
            {/* Agent Signature */}
            <SignaturePad
              label={`${t('signature.agentSignature')} *`}
              subtitle={t('signature.agentName', { name: formData.agentName || t('signature.agent') })}
              hasSignature={!!formData.agentSignature}
              signatureUri={formData.agentSignature?.uri}
              onSignatureComplete={(signatureData) => {
                setFormData(prev => ({
                  ...prev,
                  agentSignature: signatureData
                }));
              }}
              onClear={() => clearSignature('agent')}
            />

            <View style={styles.signatureNote}>
              <Icon name="info" size={16} color={colors.gray[500]} />
              <Text style={styles.signatureNoteText}>
                {t('signature.note')}
              </Text>
            </View>
          </View>
        );

      case totalSteps:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name="edit" size={24} color={colors.primary} />
              <Text style={styles.stepTitle}>{t('signature.clientSignature')}</Text>
            </View>
            
            {/* Client Signature */}
            <SignaturePad
              label={`${t('signature.clientSignature')} *`}
              subtitle={t('signature.clientName', { name: formData.clientName || t('signature.client') })}
              hasSignature={!!formData.clientSignature}
              signatureUri={formData.clientSignature?.uri}
              onSignatureComplete={(signatureData) => {
                setFormData(prev => ({
                  ...prev,
                  clientSignature: signatureData
                }));
              }}
              onClear={() => clearSignature('client')}
            />

            <View style={styles.signatureNote}>
              <Icon name="info" size={16} color={colors.gray[500]} />
              <Text style={styles.signatureNoteText}>
                {t('signature.note')}
              </Text>
            </View>
          </View>
        );

      default:
        const areaIndex = currentStep - 4;
        const area = inspectionAreas[areaIndex];
        if (!area) return null;

        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name={area.icon} size={24} color={colors.primary} />
              <Text style={styles.stepTitle}>{area.name} Inspection</Text>
            </View>
            <ScrollView ref={stepScrollViewRef} style={styles.inspectionFields}>
              {area.fields.map((field) => (
                <View key={field.id} style={styles.fieldContainer}>
                   <Text style={styles.fieldLabel}>
                     {field.label}
                   </Text>
                  {field.type === 'select' ? (
                    <View style={styles.selectContainer}>
                      {field.options?.map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInspectionFieldChange(area.id, field.id, option)}
                          style={[
                            styles.selectOption,
                            formData.inspectionData[area.id]?.[field.id] === option && { 
                              borderColor: colors.primary, 
                              backgroundColor: colors.primary 
                            }
                          ]}
                        >
                          <Text style={[
                            styles.selectOptionText,
                            formData.inspectionData[area.id]?.[field.id] === option && { color: colors.white }
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : field.type === 'textarea' ? (
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={formData.inspectionData[area.id]?.[field.id] || ''}
                      onChangeText={(value) => handleInspectionFieldChange(area.id, field.id, value)}
                      placeholder={t('inspection.enterField', { field: field.label.toLowerCase() })}
                      placeholderTextColor={colors.gray[500]}
                      multiline
                      numberOfLines={3}
                    />
                  ) : field.type === 'image' ? (
                    <View style={styles.imageFieldContainer}>
                      <TouchableOpacity
                        onPress={() => pickImage(area.id, field.id)}
                        style={[styles.addImageButton, { borderColor: colors.primary }]}
                      >
                        <Icon name="add-a-photo" size={24} color={colors.primary} />
                        <Text style={[styles.addImageText, { color: colors.primary }]}>
                          {t('inspectionCompletion.addImage')}
                        </Text>
                      </TouchableOpacity>
                      
                      {/* Display existing images */}
                      {formData.inspectionData[area.id]?.[field.id] && formData.inspectionData[area.id][field.id].length > 0 && (
                        <View style={styles.imageGrid}>
                          {formData.inspectionData[area.id][field.id].map((image: any, index: number) => (
                            <View key={index} style={styles.imageItem}>
                              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                              <TouchableOpacity
                                onPress={() => removeImageFromField(area.id, field.id, index)}
                                style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                              >
                                <Icon name="close" size={16} color={colors.white} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <TextInput
                      style={styles.textInput}
                      value={formData.inspectionData[area.id]?.[field.id] || ''}
                      onChangeText={(value) => handleInspectionFieldChange(area.id, field.id, value)}
                      placeholder={t('inspection.enterField', { field: field.label.toLowerCase() })}
                      placeholderTextColor={colors.gray[500]}
                      keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                    />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
              <Icon name="check-circle" size={24} color={colors.white} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('inspectionCompletion.title')}</Text>
              <Text style={styles.headerSubtitle}>{getStepTitle()}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {t('inspectionCompletion.step', { current: currentStep, total: totalSteps })}
            </Text>
            <Text style={styles.progressPercentage}>
              {t('inspectionCompletion.complete', { percentage: Math.round((currentStep / totalSteps) * 100) })}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { 
                  width: `${(currentStep / totalSteps) * 100}%`,
                  backgroundColor: colors.primary
                }
              ]}
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentWrapper}>
          {currentStep >= totalSteps - 1 ? (
            // No scrolling for signature steps
            <View style={styles.content}>
              {renderStepContent()}
            </View>
          ) : (
            // Allow scrolling for other steps but prevent bottom scrolling
            <ScrollView 
              ref={scrollViewRef} 
              style={styles.content}
              showsVerticalScrollIndicator={true}
              bounces={false}
              scrollEventThrottle={16}
            >
              {renderStepContent()}
            </ScrollView>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Previous Button */}
          <TouchableOpacity
            onPress={prevStep}
            disabled={currentStep === 1}
            style={[
              styles.footerButton, 
              styles.prevButton, 
              currentStep === 1 && styles.disabledButton
            ]}
          >
            <Icon name="chevron-left" size={20} color={colors.gray[600]} />
            <Text style={[styles.footerButtonText, styles.prevButtonText]}>
              {t('inspectionCompletion.previous')}
            </Text>
          </TouchableOpacity>

          {/* Next/Submit Button */}
          {currentStep === totalSteps ? (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || !isAllRequiredFieldsCompleted()}
              style={[
                styles.footerButton, 
                styles.submitButton, 
                { backgroundColor: colors.primary },
                (loading || !isAllRequiredFieldsCompleted()) && styles.disabledButton
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.footerButtonText, styles.submitButtonText]}>
                  {t('inspectionCompletion.completeInspection')}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={nextStep}
              disabled={!isCurrentStepValid()}
              style={[
                styles.footerButton,
                styles.nextButton,
                { backgroundColor: colors.primary },
                !isCurrentStepValid() && styles.disabledButton
              ]}
            >
              <Text style={[styles.footerButtonText, styles.nextButtonText]}>
                {t('inspectionCompletion.next')}
              </Text>
              <Icon name="chevron-right" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    margin: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
  },
  closeButton: {
    padding: 8,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
  },
  progressPercentage: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingBottom: 100, // Add bottom padding to account for fixed footer
    backgroundColor: colors.white,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: colors.gray[900],
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.gray[600],
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 80,
    color: colors.gray[600],
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
    color: colors.gray[900],
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: colors.gray[600],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.gray[900],
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inspectionFields: {
    maxHeight: height * 0.5,
  },
  fieldContainer: { 
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: colors.gray[600],
  },
  required: {
    color: colors.red[500],
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  selectOptionText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  prevButton: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  prevButtonText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
  },
  nextButton: {
    // backgroundColor set dynamically
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 6,
    color: colors.white,
  },
  submitButton: {
    // backgroundColor set dynamically
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
  },
  disabledButton: {
    opacity: 0.5,
  },
  imageFieldContainer: {
    marginTop: 8,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageItem: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.blue[50],
    borderRadius: 8,
    marginTop: 16,
  },
  signatureNoteText: {
    fontSize: 14,
    color: colors.gray[600],
    marginLeft: 8,
    flex: 1,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.white,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
  },
  currencyTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  currencyInput: {
    flex: 1,
    textAlign: 'right',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.white,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentMethodOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentMethodText: {
    fontSize: 14,
    color: colors.gray[600],
    fontWeight: '500',
  },
  paymentMethodTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
});

export default InspectionCompletionModal;
