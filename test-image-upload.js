// Test script to verify image upload functionality
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  try {
    console.log('=== TESTING IMAGE UPLOAD ===');
    
    // Create a test image file (1x1 pixel PNG)
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const testImagePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testImagePath, testImageBuffer);
    
    // Create FormData
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
    
    // Add test image
    formData.append('images[exterior][roof_images]', fs.createReadStream(testImagePath), {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    // Send request
    const response = await fetch('http://localhost:5000/api/reports', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test-token', // You'll need to replace this with a real token
        ...formData.getHeaders()
      }
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(result, null, 2));
    
    // Clean up test file
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
testImageUpload();
