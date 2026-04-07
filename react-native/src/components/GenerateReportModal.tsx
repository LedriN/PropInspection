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
  PanResponder,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { useWatermelonData } from '../hooks/useWatermelonData';
import { useOfflineData } from '../hooks/useOfflineData';
import { database } from '../database';
import { simpleSyncService } from '../services/simpleSyncService';
import ApiClient from '../config/api';
import { generateObjectId } from '../utils/objectIdUtils';
import SignaturePad from './SignaturePad';
import { formatAddress, getPropertyName, getClientName } from '../utils/addressUtils';

const { width, height } = Dimensions.get('window');

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportGenerated: () => void;
  reportType: string;
}

interface Property {
  _id: string;
  name: string;
  propertyType: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  size: {
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
  };
  rent_price: number;
  status: string;
  description: string;
  features: string[];
  yearBuilt: number;
  parking: string;
  petFriendly: boolean;
  furnished: boolean;
  images: string[];
  pdf: string;
  defects: string[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  _user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    databaseName: string;
  };
  _database?: {
    name: string;
    source: string;
  };
}

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  preferences: any;
  budget: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  _database?: {
    name: string;
    source: string;
  };
}

interface Agent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience: number;
  commissionRate: number;
  rating: number;
  completed_inspections: number;
  workload: number;
  databaseName: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  _isCurrentUser?: boolean;
  _database?: {
    name: string;
    source: string;
  };
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

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  onReportGenerated,
  reportType,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const stepScrollViewRef = useRef<ScrollView>(null);
  
  // Get translated inspection areas
  const inspectionAreas = getInspectionAreas(t);
  
  // Create styles with theme colors
  const styles = createStyles(colors);
  
  // Use simple database (no native modules required)
  const { properties, clients, agents, loading: dataLoading } = useWatermelonData();
  
  // Temporary: Load properties from JSON file for testing
  const [testProperties, setTestProperties] = useState<any[]>([]);
  
  useEffect(() => {
    // Load test properties from JSON file
    const loadTestProperties = async () => {
      try {
        // This is a temporary solution - in production, properties should come from the API
        const testData = [
          {
            "_id": "68ee393878c57ef0fa250a05",
            "name": "Modern Map Studio",
            "propertyType": "Studio",
            "address": {
              "street": "Bahn Map Strasse",
              "city": "Zurich",
              "state": "ZH",
              "zipCode": "8001",
              "country": "Switzerland"
            },
            "size": {
              "bedrooms": 2,
              "bathrooms": 0.5,
              "squareFeet": 110
            },
            "rent_price": 1900,
            "status": "Available",
            "description": "In Zürich bestaunen Sie die historischen Gebäude der Altstadt, flanieren durch die weltberühmte Bahnhofstrasse und geniessen den Zürichsee. Zürich bietet Ihnen einen einzigartigen Mix: Eine Metropole mit vielen Sehenswürdigkeiten trifft auf Wasser, Natur und Berge. Einfach spektakulär!",
            "features": "Klimaanlage, Balkon, Minibar",
            "yearBuilt": 2022,
            "parking": "Garage",
            "petFriendly": true,
            "furnished": true,
            "images": [
              "/uploads/2025-10-14/1760442679820-601719497.jpg",
              "/uploads/2025-10-14/1760442679851-808865480.jpg",
              "/uploads/2025-10-14/1760442679861-854005881.jpg"
            ],
            "pdf": "/uploads/2025-10-14/1760442680315-391801243.pdf",
            "defects": [],
            "createdAt": "2025-10-14T11:51:20.370Z",
            "updatedAt": "2025-10-14T11:51:20.370Z"
          },
          {
            "_id": "68ee54c9a35d16eaee2dabe3",
            "name": "Basel Apartment",
            "propertyType": "Apartment",
            "address": {
              "street": "Margarethenstrasse 63",
              "city": "Basel",
              "state": "BS",
              "zipCode": "4053",
              "country": "Switzerland"
            },
            "size": {
              "bedrooms": 3,
              "bathrooms": 2,
              "squareFeet": 122.9
            },
            "rent_price": 2100,
            "status": "Available",
            "description": "",
            "features": "",
            "yearBuilt": 2009,
            "parking": "2",
            "petFriendly": false,
            "furnished": false,
            "images": [
              "/uploads/2025-10-14/1760449737549-28818306.jpg"
            ],
            "pdf": "",
            "defects": [],
            "createdAt": "2025-10-14T13:48:57.601Z",
            "updatedAt": "2025-10-14T13:48:57.601Z"
          },
          {
            "_id": "68f891bd1fd99a75d0e9fd55",
            "name": "ledri json test",
            "propertyType": "House",
            "address": {
              "street": "Gjakovë",
              "city": "Gjakovë",
              "state": "ZH",
              "zipCode": "1000",
              "country": "Albania"
            },
            "size": {
              "bedrooms": 2,
              "bathrooms": 1,
              "squareFeet": 122
            },
            "rent_price": 2577,
            "status": "Available",
            "description": "desc",
            "features": "",
            "yearBuilt": 2022,
            "parking": "Parking",
            "petFriendly": false,
            "furnished": true,
            "images": [
              "/uploads/2025-10-22/1761120701033-239936550.png",
              "/uploads/2025-10-22/1761120701037-635288174.png",
              "/uploads/2025-10-22/1761120701038-693747900.png"
            ],
            "pdf": "/uploads/2025-10-22/1761120701482-220939418.pdf",
            "defects": [],
            "createdAt": "2025-10-22T08:11:41.550Z",
            "updatedAt": "2025-10-22T08:11:41.550Z"
          }
        ];
        setTestProperties(testData);
      } catch (error) {
        console.error('Failed to load test properties:', error);
      }
    };
    
    loadTestProperties();
  }, []);
  
  // Use test properties if no properties are loaded from the API
  const displayProperties = properties && properties.length > 0 ? properties : testProperties;
  
  // Form data
  const [formData, setFormData] = useState(() => {
    try {
      return {
        // Step 1: Property Selection
        propertyId: '',
        propertyName: '',
        
        // Step 2: Client Selection (agent is automatically set to current user)
        agentId: user?.id || '',
        agentName: user?.name || '',
        clientId: '',
        clientName: '',
        
        // Step 3: Report Details
        title: '',
        reportType: reportType || 'inspection',
        
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
    } catch (error) {
      console.error('Error initializing formData:', error);
      return {
        propertyId: '',
        propertyName: '',
        agentId: user?.id || '',
        agentName: user?.name || '',
        clientId: '',
        clientName: '',
        title: '',
        reportType: 'inspection',
        inspectionData: {},
        securityDeposit: {
          amount: '',
          currency: 'CHF',
          paymentMethod: '',
          notes: ''
        },
        agentSignature: null,
        clientSignature: null
      };
    }
  });

  const totalSteps = 11; // Property + Client + Report Details + 6 Inspection Areas + Security Deposit + Agent Signature + Client Signature

  // No need to load data manually - WatermelonDB handles this automatically!

  // Update reportType when prop changes
  useEffect(() => {
    try {
      setFormData(prev => ({
        ...prev,
        reportType: reportType || 'inspection'
      }));
    } catch (error) {
      console.error('Error updating reportType:', error);
    }
  }, [reportType]);

  // Scroll to top when step changes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        stepScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [currentStep, isOpen]);

  // Properties are now automatically loaded via WatermelonDB!

  // Clients are now automatically loaded via WatermelonDB!

  // Agents are now automatically loaded via WatermelonDB!

  const handleInputChange = (name: string, value: string) => {
    try {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } catch (error) {
      console.error('Error in handleInputChange:', error);
    }
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

  // Handle signature completion and save to inspectionData
  const handleSignatureComplete = (signatureType: 'agent' | 'client', signatureData: any) => {
    setFormData(prev => ({
      ...prev,
      [`${signatureType}Signature`]: signatureData,
      inspectionData: {
        ...prev.inspectionData,
        signatures: {
          ...(prev.inspectionData.signatures || {}),
          [signatureType]: signatureData
        }
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
      [`${signatureType}Signature`]: null,
      inspectionData: {
        ...prev.inspectionData,
        signatures: {
          ...(prev.inspectionData.signatures || {}),
          [signatureType]: null
        }
      }
    }));
  };

  const handlePropertySelect = (property: any) => {
    try {
      console.log('handlePropertySelect called with:', property);
      
      setFormData(prev => ({
        ...prev,
        propertyId: property._id || property.id,
        propertyName: getPropertyName(property)
      }));
      console.log('Property selected successfully');
    } catch (error) {
      console.error('Error selecting property:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  };

  const handleAgentSelect = (agent: Agent) => {
    try {
      console.log('handleAgentSelect called with:', agent);
      setFormData(prev => ({
        ...prev,
        agentId: agent._id || '',
        agentName: `${agent.firstName || ''} ${agent.lastName || ''}`.trim()
      }));
      console.log('Agent selected successfully');
    } catch (error) {
      console.error('Error selecting agent:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  };

  const handleClientSelect = (client: any) => {
    try {
      console.log('handleClientSelect called with:', client);
      setFormData(prev => ({
        ...prev,
        clientId: client._id || client.id,
        clientName: getClientName(client)
      }));
      console.log('Client selected successfully');
    } catch (error) {
      console.error('Error selecting client:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  };

  const nextStep = () => {
    try {
      console.log('nextStep called, currentStep:', currentStep);
      console.log('formData:', JSON.stringify(formData, null, 2));
      
      // Validate current step before proceeding
      if (currentStep === 1) {
        // Property selection validation
        if (!formData.propertyId || formData.propertyId.trim() === '') {
          Alert.alert(
            t('report.validationError'),
            t('report.selectPropertyFirst')
          );
          return;
        }
      } else if (currentStep === 2) {
        // Client selection validation
        if (!formData.clientId || formData.clientId.trim() === '') {
          Alert.alert(
            t('report.validationError'),
            t('report.selectClientFirst')
          );
          return;
        }
      } else if (currentStep === 3) {
        // Report title validation
        if (!formData.title || formData.title.trim() === '') {
          Alert.alert(
            t('report.validationError'),
            t('report.enterTitleFirst')
          );
          return;
        }
      } else if (currentStep === totalSteps - 2) {
        // Security deposit step validation
        if (!formData.securityDeposit.amount || formData.securityDeposit.amount.trim() === '') {
          Alert.alert(
            t('report.validationError'),
            'Please enter the security deposit amount'
          );
          return;
        }
      } else if (currentStep === totalSteps - 1) {
        // Agent signature step validation
        if (!formData.agentSignature) {
          Alert.alert(
            t('report.validationError'),
            t('signature.missingAgentSignature')
          );
          return;
        }
      } else if (currentStep === totalSteps) {
        // Client signature step validation
        if (!formData.clientSignature) {
          Alert.alert(
            t('report.validationError'),
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
      } else {
        console.log('Already at last step');
      }
    } catch (error) {
      console.error('Error in nextStep:', error);
      Alert.alert(t('common.error'), t('report.errorProceeding', { error: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Helper function to check if current step is valid
  const isCurrentStepValid = () => {
    if (currentStep === 1) {
      // Property selection validation
      return formData.propertyId && formData.propertyId.trim() !== '';
    } else if (currentStep === 2) {
      // Client selection validation
      return formData.clientId && formData.clientId.trim() !== '';
    } else if (currentStep === 3) {
      // Report title validation
      return formData.title && formData.title.trim() !== '';
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
    return true; // Inspection steps are always valid
  };

  // Helper function to check if all required fields are completed for submission
  const isAllRequiredFieldsCompleted = () => {
    // Check required fields for first three steps
    if (!formData.propertyId || formData.propertyId.trim() === '') {
      return false;
    }
    if (!formData.clientId || formData.clientId.trim() === '') {
      return false;
    }
    if (!formData.title || formData.title.trim() === '') {
      return false;
    }
    
    // Check security deposit
    if (!formData.securityDeposit.amount || formData.securityDeposit.amount.trim() === '') {
      return false;
    }
    
    // Check signatures
    if (!formData.agentSignature || !formData.clientSignature) {
      return false;
    }

    return true;
  };

  // Cleanup function to remove local files after successful upload
  const cleanupLocalFiles = async (processedImages: any): Promise<void> => {
    const cleanupPromises: Promise<void>[] = [];
    
    Object.keys(processedImages).forEach(area => {
      Object.keys(processedImages[area]).forEach(field => {
        const images = processedImages[area][field];
        if (Array.isArray(images) && images.length > 0) {
          images.forEach((image, index) => {
            if (image.uri && image.uri.startsWith('file://')) {
              // Note: In React Native, we can't directly delete files from the app's cache
              // The system will eventually clean them up automatically
              // But we can log them for debugging purposes
              console.log(`Local file to be cleaned up: ${area}.${field}[${index}] = ${image.uri}`);
              
              // In a real implementation, you might want to use a library like
              // react-native-fs to delete the files, but for now we'll just log
              // The files will be cleaned up by the system eventually
            }
          });
        }
      });
    });
    
    // Wait for all cleanup operations to complete
    await Promise.all(cleanupPromises);
  };

  // Helper function to separate images from inspection data
  const separateImagesFromInspectionData = (inspectionData: any) => {
    const cleanInspectionData: any = {};
    const images: any = {};
    
    Object.keys(inspectionData || {}).forEach(area => {
      cleanInspectionData[area] = {};
      images[area] = {};
      
      Object.keys(inspectionData[area] || {}).forEach(field => {
        const value = inspectionData[area][field];
        
        // Check if this is an image field (contains array of image objects)
        if (Array.isArray(value) && value.length > 0 && value[0]?.uri) {
          images[area][field] = value;
        } else {
          // This is regular inspection data
          cleanInspectionData[area][field] = value;
        }
      });
    });
    
    return { cleanInspectionData, images };
  };

  // Dynamic report saving - online to MongoDB, offline to local storage
  const saveReportDynamically = async () => {
    console.log('Saving report dynamically...');
    
    try {
      // Get selected entities
      const selectedProperty = displayProperties.find((p: any) => (p._id || p.id) === formData.propertyId);
      const selectedClient = clients.find((c: any) => (c._id || c.id) === formData.clientId);
      
      // Separate images from inspection data
      const { cleanInspectionData, images } = separateImagesFromInspectionData(formData.inspectionData);
      
      console.log('=== SEPARATED DATA ===');
      console.log('Clean inspection data:', cleanInspectionData);
      console.log('Images data:', images);
      
      // Create report content with signatures included in inspectionData
      const reportContent = {
        inspectionData: {
          ...cleanInspectionData,
          // Include signatures in inspectionData
          signatures: {
            agent: formData.agentSignature,
            client: formData.clientSignature
          }
        },
        findings: [], // Will be populated from inspection data
        images: images,
        securityDeposit: formData.securityDeposit,
        property: selectedProperty ? {
          name: getPropertyName(selectedProperty),
          address: getPropertyName(selectedProperty),
          type: selectedProperty.type || selectedProperty.propertyType,
          size: {
            bedrooms: selectedProperty.bedrooms || 0,
            bathrooms: selectedProperty.bathrooms || 0,
            squareFeet: selectedProperty.area || selectedProperty.squareFeet || 0
          }
        } : null,
        agent: {
          name: user?.name || 'Agent',
          email: user?.email || '',
          databaseName: user?.databaseName || ''
        },
        client: selectedClient ? {
          name: getClientName(selectedClient),
          email: selectedClient.email,
          phone: selectedClient.phone || selectedClient.phoneNumber
        } : null,
        // Keep signatures at root level for backward compatibility
        signatures: {
          agent: formData.agentSignature,
          client: formData.clientSignature
        }
      };

      // Generate a consistent ObjectId for the report
      const reportId = generateObjectId();
      
      // Create a unique identifier for tracking across sync operations
      const uniqueIdentifier = `${user?.id || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create report data with consistent ID format
      const reportData = {
        id: reportId, // Use consistent ObjectId format
        uniqueIdentifier, // Add unique identifier for tracking
        title: formData.title,
        reportType: formData.reportType || 'inspection',
        propertyId: formData.propertyId,
        clientId: formData.clientId,
        agentId: user?.id || '',
        content: reportContent,
        status: 'Draft',
        generatedAt: new Date(),
        generatedBy: user?.email || 'current-user',
        propertyName: formData.propertyName || getPropertyName(selectedProperty),
        clientName: formData.clientName || getClientName(selectedClient),
        agentName: user?.name || 'Agent',
        agentEmail: user?.email || '',
        clientEmail: selectedClient?.email || '',
        isSynced: false, // Will be updated based on save method
        syncError: null,
      };

      // Check if we're online
      const syncStatus = simpleSyncService.getSyncStatus();
      
      if (syncStatus.isOnline) {
        console.log('Online - saving directly to MongoDB...');
        try {
          // Save directly to MongoDB via API
          const savedReport = await saveReportToMongoDB(reportData);
          console.log('Report saved directly to MongoDB:', savedReport.id);
          return savedReport;
        } catch (apiError) {
          console.warn('Failed to save to MongoDB, falling back to local storage:', apiError);
          // Fall back to local storage if API fails
          return await saveReportLocally(reportData);
        }
      } else {
        console.log('Offline - saving to local storage...');
        // Save to local storage for later sync
        return await saveReportLocally(reportData);
      }
      
    } catch (error) {
      console.error('Failed to save report:', error);
      throw new Error('Failed to save report');
    }
  };

  // Save report directly to MongoDB via API
  const saveReportToMongoDB = async (reportData: any) => {
    console.log('Saving report to MongoDB via API...');
    
    // Create FormData for the API request
    const formData = new FormData();
    
    // Append basic report data
    formData.append('title', reportData.title);
    formData.append('report_type', reportData.reportType);
    formData.append('property_name', reportData.propertyName);
    formData.append('agent_name', reportData.agentName);
    formData.append('client_name', reportData.clientName);
    formData.append('property_id', reportData.propertyId);
    formData.append('agent_id', reportData.agentId);
    formData.append('client_id', reportData.clientId);
    formData.append('status', reportData.status);
    formData.append('generated_at', reportData.generatedAt.toISOString());
    formData.append('generated_by', reportData.generatedBy);
    formData.append('agent_email', reportData.agentEmail || '');
    formData.append('client_email', reportData.clientEmail || '');
    // Include unique identifier for better tracking
    if (reportData.uniqueIdentifier) {
      formData.append('unique_identifier', reportData.uniqueIdentifier);
    }
    
    // Create content without images and signatures for JSON serialization
    const contentWithoutFiles = {
      ...reportData.content,
      images: {}, // Will be populated by server from uploaded files
      signatures: {} // Will be populated by server from uploaded files
    };
    formData.append('content', JSON.stringify(contentWithoutFiles));

    // Handle signatures if they exist - only upload local files
    if (reportData.content?.signatures?.agent) {
      const agentSig = reportData.content.signatures.agent;
      if (agentSig.uri && agentSig.uri.startsWith('file://')) {
        console.log('Uploading agent signature:', agentSig.uri);
        formData.append('agentSignature', {
          uri: agentSig.uri,
          name: agentSig.name || 'agent_signature.png',
          type: agentSig.type || 'image/png',
        } as any);
      }
    }
    
    if (reportData.content?.signatures?.client) {
      const clientSig = reportData.content.signatures.client;
      if (clientSig.uri && clientSig.uri.startsWith('file://')) {
        console.log('Uploading client signature:', clientSig.uri);
        formData.append('clientSignature', {
          uri: clientSig.uri,
          name: clientSig.name || 'client_signature.png',
          type: clientSig.type || 'image/png',
        } as any);
      }
    }

    // Handle images - only upload local files
    if (reportData.content?.images) {
      console.log('Processing images for upload...');
      Object.keys(reportData.content.images).forEach(area => {
        Object.keys(reportData.content.images[area]).forEach(field => {
          const images = reportData.content.images[area][field];
          if (Array.isArray(images)) {
            images.forEach((image, index) => {
              // Only upload local files (file:// URIs)
              if (image.uri && image.uri.startsWith('file://')) {
                console.log(`Uploading image: ${area}.${field}[${index}] = ${image.uri}`);
                formData.append(`images[${area}][${field}]`, {
                  uri: image.uri,
                  name: image.name || `image_${Date.now()}_${index}.jpg`,
                  type: image.type || 'image/jpeg',
                } as any);
              } else if (image.uri) {
                console.log(`Skipping non-local image: ${area}.${field}[${index}] = ${image.uri}`);
              }
            });
          }
        });
      });
    }

    console.log('Sending FormData to backend...');
    // Send to backend
    const response = await ApiClient.getInstance().post<{ data: any }>('/reports', formData);
    
    console.log('Backend response received:', response.data);
    
    // Update report data with server response (including processed images)
    const savedReport = {
      ...reportData,
      id: response.data._id, // Use server-generated ID
      isSynced: true,
      syncError: null,
      updatedAt: new Date(),
      // Update content with server-processed data (including image URLs)
      content: response.data.content || reportData.content,
    };

    // Also save to local database for offline access
    await database.createReport(savedReport);
    
    return savedReport;
  };

  // Save report to local storage
  const saveReportLocally = async (reportData: any) => {
    console.log('Saving report to local storage...');
    
    const localReport = {
      ...reportData,
      isSynced: false, // Mark as unsynced
      syncError: null,
    };

    const savedReport = await database.createReport(localReport);
    console.log('Report saved to local storage:', savedReport.id);
    return savedReport;
  };

  const handleSubmit = async () => {
    try {
      // Validate user authentication first
      if (!user || !user.id) {
        Alert.alert(
          t('common.error'), 
          'User authentication required. Please log in again.'
        );
        return;
      }

      // Validate required fields for first three steps
      if (!formData.propertyId || formData.propertyId.trim() === '') {
        Alert.alert(t('report.validationError'), t('report.selectPropertyFirst'));
        return;
      }
      if (!formData.clientId || formData.clientId.trim() === '') {
        Alert.alert(t('report.validationError'), t('report.selectClientFirst'));
        return;
      }
      if (!formData.title || formData.title.trim() === '') {
        Alert.alert(t('report.validationError'), t('report.enterTitleFirst'));
        return;
      }
      
      // Validate signatures
      if (!formData.agentSignature || !formData.clientSignature) {
        Alert.alert(t('report.validationError'), t('signature.missingSignatures', { signatures: [
          !formData.agentSignature ? t('signature.agent') : '',
          !formData.clientSignature ? t('signature.client') : ''
        ].filter(Boolean).join(', ') }));
        return;
      }

      setLoading(true);
      
      // Save report dynamically (online to MongoDB, offline to local)
      const savedReport = await saveReportDynamically();
      
      // Show appropriate success message based on sync status
      const syncStatus = simpleSyncService.getSyncStatus();
      if (savedReport.isSynced) {
      } 
      
      onReportGenerated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error generating report:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        response: (error as any).response?.data,
        status: (error as any).response?.status
      });
      
      // Provide more specific error message
      let errorMessage = t('report.failedToGenerate');
      if ((error as any).response?.data?.message) {
        errorMessage = (error as any).response.data.message;
        
        // Handle specific error cases
        if (errorMessage.includes('Property not found in any database')) {
          errorMessage = t('report.propertyNotFoundError') || 'The selected property could not be found. Please try selecting a different property or contact support.';
        } else if (errorMessage.includes('Client not found in any database')) {
          errorMessage = t('report.clientNotFoundError') || 'The selected client could not be found. Please try selecting a different client or contact support.';
        } else if (errorMessage.includes('Missing required fields')) {
          errorMessage = t('report.missingFieldsError') || 'Please ensure all required fields are filled out correctly.';
        }
      } else if ((error as Error).message) {
        errorMessage = (error as Error).message;
      }
      
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      propertyId: '',
      propertyName: '',
      agentId: user?.id || '',
      agentName: user?.name || '',
      clientId: '',
      clientName: '',
      title: '',
      reportType: reportType || 'inspection',
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
    if (currentStep === 1) return t('report.selectProperty');
    if (currentStep === 2) return t('report.selectClient');
    if (currentStep === 3) return t('report.reportDetails');
    if (currentStep === totalSteps - 2) return 'Security Deposit';
    if (currentStep === totalSteps - 1) return t('signature.agentSignature');
    if (currentStep === totalSteps) return t('signature.clientSignature');
    const areaIndex = currentStep - 4;
    return inspectionAreas[areaIndex]?.name || t('inspection.exterior');
  };

  
  const renderStepContent = () => {
    try {
      console.log('renderStepContent called with currentStep:', currentStep);
      switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}> 
            <View style={styles.stepHeader}>
              <Icon name="home" size={24} color={colors.icon} />
              <Text style={styles.stepTitle}>{t('report.selectProperty')}</Text>
            </View>
            {!displayProperties || displayProperties.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="home" size={48} color={colors.icon} />
                <Text style={styles.emptyMessage}>{t('report.noProperties') || 'No Properties Available'}</Text>
                <Text style={styles.emptyDescription}>
                  {t('report.noPropertiesMessage') || 'Properties will be loaded from the backend. Make sure you have properties in your system.'}
                </Text>
                <Text style={styles.debugText}>
                  Debug: Properties count: {displayProperties?.length || 0}, Loading: {dataLoading ? 'Yes' : 'No'}
                </Text>
                <TouchableOpacity
                  style={styles.createPropertyButton}
                  onPress={() => {
                    if (dataLoading) {
                      Alert.alert('Loading', 'Properties are being loaded from the backend...');
                    } else {
                      Alert.alert(
                        'Properties from Backend',
                        'Properties are loaded from the backend. Please add properties through the web dashboard or ensure you have properties in your system.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <Text style={styles.createPropertyButtonText}>
                    {dataLoading ? 'Loading...' : (t('report.goToProperties') || 'Check Backend')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView ref={stepScrollViewRef} style={styles.selectionList}>
                {displayProperties.map((property: any) => (
                  <TouchableOpacity
                    key={property._id || property.id}
                    onPress={() => handlePropertySelect(property)}
                    style={[
                      styles.selectionItem,
                      formData.propertyId === (property._id || property.id) && styles.selectionItemActive
                    ]}
                  >
                    <Text style={styles.selectionItemTitle}>
                      {property.name || getPropertyName(property) || 'Property Address'}
                    </Text>
                    <Text style={styles.selectionItemSubtitle}>
                      {property.propertyType || property.type || 'Property'} - {property.size?.bedrooms || property.bedrooms || 0} bed, {property.size?.bathrooms || property.bathrooms || 0} bath
                    </Text>
                    <Text style={styles.selectionItemUser}>
                      ${property.rent_price || property.rentPrice || property.rent || 0}/month
                    </Text>
                    {/* Add property address */}
                    <Text style={styles.selectionItemAddress}>
                      {property.address?.street && property.address?.city ? 
                        `${property.address.street}, ${property.address.city}` : 
                        property.address?.city || ''
                      }
                    </Text>
                    {/* Add property features if available */}
                    {property.features && (
                      <Text style={styles.selectionItemFeatures}>
                        Features: {property.features}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name="person" size={24} color={colors.icon} />
              <Text style={styles.stepTitle}>{t('report.selectClient')}</Text>
            </View>
            
            {/* Show current agent info */}
            <View style={styles.selectionSection}>
              <Text style={styles.sectionLabel}>{t('report.currentAgent')}</Text>
              <View style={[styles.selectionItem, styles.selectionItemActive]}>
                <Text style={styles.selectionItemTitle}>
                  {user?.name || 'Current User'}
                </Text>
                <Text style={styles.selectionItemSubtitle}>{user?.email || ''}</Text>
                <Text style={styles.selectionItemUser}>
                  {t('report.you')}
                </Text>
              </View>
            </View>

            {/* Client Selection */}
            <View style={styles.selectionSection}>
              <Text style={styles.sectionLabel}>{t('report.selectClient')}</Text>
              {!clients || clients.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="person" size={32} color={colors.icon} />
                  <Text style={styles.emptyMessage}>{t('report.noClients') || 'No Clients Available'}</Text>
                  <Text style={styles.emptyDescription}>
                    {t('report.noClientsMessage') || 'Clients will be loaded from the backend. Make sure you have clients in your system.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.createPropertyButton}
                    onPress={() => {
                      if (dataLoading) {
                        Alert.alert('Loading', 'Clients are being loaded from the backend...');
                      } else {
                        Alert.alert(
                          'Clients from Backend',
                          'Clients are loaded from the backend. Please add clients through the web dashboard or ensure you have clients in your system.',
                          [{ text: 'OK' }]
                        );
                      }
                    }}
                  >
                    <Text style={styles.createPropertyButtonText}>
                      {dataLoading ? 'Loading...' : 'Check Backend'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView ref={stepScrollViewRef} style={styles.selectionList} horizontal showsHorizontalScrollIndicator={false}>
                  {clients.map((client: any) => (
                    <TouchableOpacity
                    key={client._id || client.id}
                      onPress={() => handleClientSelect(client)}
                      style={[
                        styles.selectionItem,
                        styles.selectionItemHorizontal,
                        formData.clientId === (client._id || client.id) && styles.selectionItemActive
                      ]}
                    >
                      <Text style={styles.selectionItemTitle}>
                        {getClientName(client)}
                      </Text>
                      <Text style={styles.selectionItemSubtitle}>{client.email || 'No email'}</Text>
                      <Text style={styles.selectionItemUser}>
                        {client.phone || client.phoneNumber || 'No phone'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Icon name="description" size={24} color={colors.icon} />
              <Text style={styles.stepTitle}>{t('report.reportDetails')}</Text>
            </View>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('report.reportTitle')}</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
                placeholder={t('report.reportTitlePlaceholder')}
                placeholderTextColor={colors.gray[500]}
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
              subtitle={t('signature.agentName', { name: formData.agentName || user?.name || t('signature.agent') })}
              hasSignature={!!formData.agentSignature}
              signatureUri={formData.agentSignature?.uri}
              onSignatureComplete={(signatureData) => {
                handleSignatureComplete('agent', signatureData);
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
                handleSignatureComplete('client', signatureData);
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
              <Icon name={area.icon} size={24} color={colors.icon} />
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
                            formData.inspectionData[area.id]?.[field.id] === option && styles.selectOptionActive
                          ]}
                        >
                          <Text style={[
                            styles.selectOptionText,
                            formData.inspectionData[area.id]?.[field.id] === option && styles.selectOptionTextActive
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
                        <Icon name="add-a-photo" size={24} color={colors.icon} />
                        <Text style={[styles.addImageText, { color: colors.icon }]}>
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
                                style={[styles.removeImageButton, { backgroundColor: colors.red[600] }]}
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
    } catch (error) {
      console.error('Error in renderStepContent:', error);
      console.error('renderStepContent error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return (
        <View style={styles.stepContent}>
          <Text style={styles.errorText}>{t('report.errorRendering')}</Text>
        </View>
      );
    }
  };

  if (!isOpen) return null;

  try {
    return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Icon name="description" size={24} color={colors.white} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('report.generate')}</Text>
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
              {t('report.step', { current: currentStep, total: totalSteps })}
            </Text>
            <Text style={styles.progressPercentage}>
              {t('report.complete', { percentage: Math.round((currentStep / totalSteps) * 100) })}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(currentStep / totalSteps) * 100}%` }
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
            style={[styles.footerButton, styles.prevButton, currentStep === 1 && styles.disabledButton]}
          >
            <Icon name="chevron-left" size={20} color={colors.gray[600]} />
            <Text style={[styles.footerButtonText, styles.prevButtonText]}>{t('report.previous')}</Text>
          </TouchableOpacity>

          {/* Next/Submit Button */}
          {currentStep === totalSteps ? (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || !isAllRequiredFieldsCompleted()}
              style={[styles.footerButton, styles.submitButton, (loading || !isAllRequiredFieldsCompleted()) && styles.disabledButton]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.footerButtonText, styles.submitButtonText]}>{t('report.generateReport')}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={nextStep}
              disabled={!isCurrentStepValid()}
              style={[
                styles.footerButton,
                styles.nextButton,
                !isCurrentStepValid() && styles.disabledButton
              ]}
            >
              <Text style={[styles.footerButtonText, styles.nextButtonText]}>{t('report.next')}</Text>
              <Icon name="chevron-right" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
  } catch (error) {
    console.error('Error in GenerateReportModal render:', error);
    console.error('GenerateReportModal render error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return (
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('common.error')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.errorText}>{t('report.errorRenderingModal')}</Text>
            <Text style={styles.errorText}>{error instanceof Error ? error.message : 'Unknown error'}</Text>
          </View>
        </View>
      </Modal>
    );
  }
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
    backgroundColor: colors.primary,
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
    color: colors.gray[500],
    
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
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
    color: colors.gray[900],
    marginLeft: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.gray[600],
  },
  selectionList: {
    
  },
  selectionItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectionItemHorizontal: {
    width: width * 0.7,
    marginRight: 12,
    marginBottom: 0,
  },
  selectionItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.blue[50],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  selectionItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  selectionItemSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
  },
  selectionItemUser: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  selectionItemAddress: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 4,
  },
  selectionItemFeatures: {
    fontSize: 12,
    color: colors.gray[500],
    fontStyle: 'italic',
    marginTop: 4,
  },
  debugText: {
    fontSize: 12,
    color: colors.gray[400],
    marginTop: 8,
    textAlign: 'center',
  },
  selectionSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
    marginBottom: 12,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.gray[900],
    backgroundColor: colors.white,
  },
  textArea: {
    height: 80,
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
    color: colors.gray[600],
    marginBottom: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  selectOptionText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  selectOptionTextActive: {
    color: colors.white,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
    color: colors.gray[600],
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    marginRight: 6,
  },
  submitButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[500],
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 20,
  },
  createPropertyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPropertyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: colors.red[500],
    textAlign: 'center',
    marginVertical: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  },
  currencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
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
  },
  paymentMethodOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
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

export default GenerateReportModal;
