import { database } from '../database';
import { Q } from '@nozbe/watermelondb';

export const testWatermelonDB = async () => {
  try {
    console.log('Testing WatermelonDB setup...');
    
    // Test database connection
    const collections = database.collections;
    console.log('Available collections:', Object.keys(collections));
    
    // Test creating a sample property
    const sampleProperty = await database.write(async () => {
      return await database.get('properties').create((property: any) => {
        property.address = '123 Test Street';
        property.type = 'Apartment';
        property.bedrooms = 2;
        property.bathrooms = 1;
        property.area = 800;
        property.rentPrice = 1200;
        property.deposit = 1200;
        property.createdAt = new Date();
        property.updatedAt = new Date();
      });
    });
    
    console.log('Sample property created:', sampleProperty.id);
    
    // Test creating a sample client
    const sampleClient = await database.write(async () => {
      return await database.get('clients').create((client: any) => {
        client.name = 'John Doe';
        client.email = 'john@example.com';
        client.phone = '555-0123';
        client.type = 'Tenant';
        client.createdAt = new Date();
        client.updatedAt = new Date();
      });
    });
    
    console.log('Sample client created:', sampleClient.id);
    
    // Test creating a sample report
    const sampleReport = await database.write(async () => {
      return await database.get('reports').create((report: any) => {
        report.title = 'Test Inspection Report';
        report.reportType = 'inspection';
        report.propertyId = sampleProperty.id;
        report.clientId = sampleClient.id;
        report.agentId = 'test-agent-id';
        report.setContent({
          inspectionData: {
            exterior: {
              roof_condition: 'Good',
              siding_condition: 'Fair'
            }
          },
          findings: [],
          images: {},
          property: {
            name: '123 Test Street',
            address: '123 Test Street',
            type: 'Apartment'
          },
          agent: {
            name: 'Test Agent',
            email: 'agent@example.com'
          },
          client: {
            name: 'John Doe',
            email: 'john@example.com'
          },
          signatures: {}
        });
        report.status = 'Draft';
        report.generatedAt = new Date();
        report.generatedBy = 'test-agent@example.com';
        report.propertyName = '123 Test Street';
        report.clientName = 'John Doe';
        report.agentName = 'Test Agent';
        report.agentEmail = 'agent@example.com';
        report.clientEmail = 'john@example.com';
        report.isSynced = false;
        report.syncError = null;
        report.createdAt = new Date();
        report.updatedAt = new Date();
      });
    });
    
    console.log('Sample report created:', sampleReport.id);
    
    // Test querying data
    const allProperties = await database.get('properties').query().fetch();
    const allClients = await database.get('clients').query().fetch();
    const allReports = await database.get('reports').query().fetch();
    
    console.log('Total properties:', allProperties.length);
    console.log('Total clients:', allClients.length);
    console.log('Total reports:', allReports.length);
    
    // Test unsynced reports query
    const unsyncedReports = await database.get('reports')
      .query(Q.where('is_synced', false))
      .fetch();
    
    console.log('Unsynced reports:', unsyncedReports.length);
    
    console.log('WatermelonDB test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('WatermelonDB test failed:', error);
    return false;
  }
};
