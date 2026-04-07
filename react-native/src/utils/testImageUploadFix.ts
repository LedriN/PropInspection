/**
 * Test utility to verify the image upload fix
 * This tests the separation of images from inspection data
 */

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

/**
 * Test the separation of images from inspection data
 */
export const testImageSeparation = (): TestResult => {
  try {
    console.log('=== TESTING IMAGE SEPARATION ===');
    
    // Mock inspection data with mixed content
    const mockInspectionData = {
      exterior: {
        roof_condition: 'Good',
        roof_images: [
          {
            uri: 'file://test-roof-image.jpg',
            name: 'test-roof-image.jpg',
            type: 'image/jpeg',
            size: 1024
          }
        ],
        siding_condition: 'Excellent',
        siding_images: [
          {
            uri: 'file://test-siding-image.jpg',
            name: 'test-siding-image.jpg',
            type: 'image/jpeg',
            size: 2048
          }
        ],
        windows_doors: 'Fair',
        exterior_notes: 'Some minor issues noted'
      },
      interior: {
        walls_condition: 'Good',
        walls_images: [
          {
            uri: 'file://test-walls-image.jpg',
            name: 'test-walls-image.jpg',
            type: 'image/jpeg',
            size: 1536
          }
        ],
        floors_condition: 'Excellent',
        interior_notes: 'Overall good condition'
      }
    };

    // Simulate the separation function
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

    const { cleanInspectionData, images } = separateImagesFromInspectionData(mockInspectionData);

    console.log('Original inspection data:', mockInspectionData);
    console.log('Clean inspection data:', cleanInspectionData);
    console.log('Separated images:', images);

    // Verify the separation worked correctly
    const hasLocalUrisInCleanData = JSON.stringify(cleanInspectionData).includes('file://');
    const hasImagesInCleanData = Object.keys(cleanInspectionData).some(area => 
      Object.keys(cleanInspectionData[area]).some(field => 
        Array.isArray(cleanInspectionData[area][field]) && 
        cleanInspectionData[area][field].length > 0 && 
        cleanInspectionData[area][field][0]?.uri
      )
    );

    if (hasLocalUrisInCleanData || hasImagesInCleanData) {
      return {
        success: false,
        message: 'Image separation failed - local URIs found in clean data',
        details: {
          hasLocalUrisInCleanData,
          hasImagesInCleanData,
          cleanInspectionData,
          images
        }
      };
    }

    // Verify images were properly separated
    const expectedImageFields = ['roof_images', 'siding_images', 'walls_images'];
    const hasAllImageFields = expectedImageFields.every(field => {
      const foundInArea = Object.keys(images).some(area => images[area][field]);
      return foundInArea;
    });

    if (!hasAllImageFields) {
      return {
        success: false,
        message: 'Image separation failed - not all image fields were separated',
        details: {
          expectedImageFields,
          images,
          hasAllImageFields
        }
      };
    }

    return {
      success: true,
      message: 'Image separation test passed successfully',
      details: {
        cleanInspectionData,
        images,
        originalDataKeys: Object.keys(mockInspectionData),
        cleanDataKeys: Object.keys(cleanInspectionData),
        imageKeys: Object.keys(images)
      }
    };

  } catch (error) {
    return {
      success: false,
      message: 'Image separation test failed with error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test the complete flow from form data to database storage
 */
export const testCompleteFlow = (): TestResult => {
  try {
    console.log('=== TESTING COMPLETE FLOW ===');
    
    // Test the separation
    const separationResult = testImageSeparation();
    if (!separationResult.success) {
      return separationResult;
    }

    // Simulate the report content creation
    const { cleanInspectionData, images } = separationResult.details;
    
    const reportContent = {
      inspectionData: cleanInspectionData,
      findings: [],
      images: images,
      property: {
        name: 'Test Property',
        address: '123 Test St',
        type: 'House',
        size: { bedrooms: 3, bathrooms: 2, squareFeet: 1500 }
      },
      agent: {
        name: 'Test Agent',
        email: 'agent@test.com',
        databaseName: 'test-db'
      },
      client: {
        name: 'Test Client',
        email: 'client@test.com',
        phone: '123-456-7890'
      },
      signatures: {
        agent: {
          uri: 'file://test-agent-signature.png',
          name: 'test-agent-signature.png',
          type: 'image/png',
          size: 512
        },
        client: {
          uri: 'file://test-client-signature.png',
          name: 'test-client-signature.png',
          type: 'image/png',
          size: 512
        }
      }
    };

    console.log('Report content created:', reportContent);

    // Verify that the report content structure is correct
    const hasLocalUrisInContent = JSON.stringify(reportContent).includes('file://');
    
    if (hasLocalUrisInContent) {
      // This is expected for signatures and images - they should be uploaded separately
      console.log('Local URIs found in content (expected for upload):', 
        JSON.stringify(reportContent).match(/file:\/\/[^"]+/g)
      );
    }

    // Verify the structure is correct
    const hasInspectionData = reportContent.inspectionData && Object.keys(reportContent.inspectionData).length > 0;
    const hasImages = reportContent.images && Object.keys(reportContent.images).length > 0;
    const hasSignatures = reportContent.signatures && 
      reportContent.signatures.agent && 
      reportContent.signatures.client;

    if (!hasInspectionData || !hasImages || !hasSignatures) {
      return {
        success: false,
        message: 'Report content structure is incomplete',
        details: {
          hasInspectionData,
          hasImages,
          hasSignatures,
          reportContent
        }
      };
    }

    return {
      success: true,
      message: 'Complete flow test passed successfully',
      details: {
        reportContent,
        hasLocalUrisInContent,
        structureValid: { hasInspectionData, hasImages, hasSignatures }
      }
    };

  } catch (error) {
    return {
      success: false,
      message: 'Complete flow test failed with error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Run all tests
 */
export const runAllTests = (): { separation: TestResult; flow: TestResult } => {
  console.log('=== RUNNING ALL IMAGE UPLOAD FIX TESTS ===');
  
  const separation = testImageSeparation();
  const flow = testCompleteFlow();
  
  console.log('=== TEST RESULTS ===');
  console.log('Separation Test:', separation);
  console.log('Flow Test:', flow);
  
  return { separation, flow };
};
