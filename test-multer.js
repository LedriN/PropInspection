// Test script to verify Multer is working correctly
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testMulter() {
  try {
    console.log('=== TESTING MULTER UPLOAD ===');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const testImagePath = './test-image.png';
    fs.writeFileSync(testImagePath, testImageData);
    
    const formData = new FormData();
    formData.append('title', 'Test Report');
    formData.append('report_type', 'inspection');
    formData.append('property_name', 'Test Property');
    formData.append('agent_name', 'Test Agent');
    formData.append('client_name', 'Test Client');
    formData.append('property_id', '');
    formData.append('agent_id', '');
    formData.append('client_id', '');
    formData.append('content', JSON.stringify({
      inspectionData: {},
      findings: [],
      images: {},
      property: null,
      agent: null,
      client: null
    }));
    formData.append('inspectionData', JSON.stringify({}));
    
    // Add test image with the same field name format as React Native
    formData.append('images[exterior][roof_images]', fs.createReadStream(testImagePath), {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    console.log('Sending request to server...');
    console.log('FormData headers:', formData.getHeaders());
    
    const response = await fetch('http://localhost:5000/api/reports', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test-token',
        ...formData.getHeaders()
      }
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    // Clean up
    fs.unlinkSync(testImagePath);
    
    if (result.success && result.data?.content?.images) {
      console.log('=== UPLOAD SUCCESS ===');
      console.log('Images uploaded:', result.data.content.images);
      
      // Test image access
      Object.keys(result.data.content.images).forEach(area => {
        Object.keys(result.data.content.images[area]).forEach(field => {
          const images = result.data.content.images[area][field];
          if (Array.isArray(images)) {
            images.forEach((image, index) => {
              console.log(`Image ${area}.${field}[${index}]:`, image.uri);
              
              // Test if image is accessible
              const imageUrl = `http://localhost:5000${image.uri}`;
              fetch(imageUrl)
                .then(imgResponse => {
                  if (imgResponse.ok) {
                    console.log(`✓ Image accessible: ${imageUrl}`);
                  } else {
                    console.log(`✗ Image not accessible: ${imageUrl} (${imgResponse.status})`);
                  }
                })
                .catch(err => {
                  console.log(`✗ Image fetch error: ${imageUrl}`, err.message);
                });
            });
          }
        });
      });
    } else {
      console.log('=== UPLOAD FAILED ===');
      console.log('Error:', result.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testMulter();
