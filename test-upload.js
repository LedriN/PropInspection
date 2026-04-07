// Simple test to verify image upload functionality
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    console.log('Testing image upload...');
    
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
    
    // Add test image
    formData.append('images[exterior][roof_images]', fs.createReadStream(testImagePath), {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    console.log('Sending request to server...');
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
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testUpload();
