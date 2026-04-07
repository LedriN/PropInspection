import { database } from '../database';
import { Inspection as InspectionType, Property as PropertyType, Client as ClientType, Agent as AgentType, User as UserType, InspectionItem as InspectionItemType } from '../types';
import { offlineApiService } from './offlineApiService';


export class InspectionService {
  private static instance: InspectionService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): InspectionService {
    if (!InspectionService.instance) {
      InspectionService.instance = new InspectionService();
    }
    return InspectionService.instance;
  }

  private async initializeData(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize database
      await database.init();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  public async getInspections(userId?: string): Promise<InspectionType[]> {
    await this.initializeData();

    try {
      const whereClause = userId ? 'WHERE i.agent_id = ?' : '';
      const params = userId ? [userId] : [];
      
      const sql = `
        SELECT 
          i.*,
          p.address, p.type as property_type, p.bedrooms, p.bathrooms, p.area, p.rent_price, p.deposit,
          c.name as client_name, c.email as client_email, c.phone as client_phone, c.type as client_type,
          a.name as agent_name, a.email as agent_email, a.phone as agent_phone, a.avatar as agent_avatar
        FROM inspections i
        JOIN properties p ON i.property_id = p.id
        JOIN clients c ON i.client_id = c.id
        JOIN agents a ON i.agent_id = a.id
        ${whereClause}
        ORDER BY i.scheduled_date DESC
      `;

      const inspections = await database.query(sql, params);

      const inspectionData = await Promise.all(
        inspections.map(async (inspection) => {
          const items = await database.findAll('inspection_items', 'inspection_id = ?', [inspection.id]);
          const mediaFiles = await database.findAll('media_files', 'inspection_id = ?', [inspection.id]);

          const inspectionItems: InspectionItemType[] = items.map((item) => ({
            id: item.id,
            category: item.category,
            item: item.item,
            condition: item.condition as any,
            notes: item.notes,
            photos: mediaFiles.filter(m => m.type === 'photo' && m.inspection_item_id === item.id).map(m => m.uri),
            videos: mediaFiles.filter(m => m.type === 'video' && m.inspection_item_id === item.id).map(m => m.uri)
          }));

          return {
            id: inspection.id,
            propertyId: inspection.property_id,
            property: {
              id: inspection.property_id,
              address: inspection.address,
              type: inspection.property_type as any,
              bedrooms: inspection.bedrooms,
              bathrooms: inspection.bathrooms,
              area: inspection.area,
              rentPrice: inspection.rent_price,
              deposit: inspection.deposit
            },
            clientId: inspection.client_id,
            client: {
              id: inspection.client_id,
              name: inspection.client_name,
              email: inspection.client_email,
              phone: inspection.client_phone,
              type: inspection.client_type as any
            },
            agentId: inspection.agent_id,
            agent: {
              id: inspection.agent_id,
              name: inspection.agent_name,
              email: inspection.agent_email,
              phone: inspection.agent_phone,
              avatar: inspection.agent_avatar
            },
            type: inspection.type as any,
            status: inspection.status as any,
            scheduledDate: new Date(inspection.scheduled_date).toISOString(),
            completedDate: inspection.completed_date ? new Date(inspection.completed_date).toISOString() : undefined,
            items: inspectionItems,
            generalNotes: inspection.general_notes,
            // Signatures are now stored only on backend, not locally
            tenantSignature: undefined,
            agentSignature: undefined,
            reportUrl: inspection.report_url,
            photos: mediaFiles.filter(m => m.type === 'photo' && !m.inspection_item_id).map(m => m.uri),
            videos: mediaFiles.filter(m => m.type === 'video' && !m.inspection_item_id).map(m => m.uri)
          };
        })
      );

      return inspectionData;
    } catch (error) {
      console.error('Failed to get inspections:', error);
      return [];
    }
  }

  public async getInspectionById(id: string): Promise<InspectionType | null> {
    try {
      await database.init();

      const sql = `
        SELECT 
          i.*,
          p.address, p.type as property_type, p.bedrooms, p.bathrooms, p.area, p.rent_price, p.deposit,
          c.name as client_name, c.email as client_email, c.phone as client_phone, c.type as client_type,
          a.name as agent_name, a.email as agent_email, a.phone as agent_phone, a.avatar as agent_avatar
        FROM inspections i
        JOIN properties p ON i.property_id = p.id
        JOIN clients c ON i.client_id = c.id
        JOIN agents a ON i.agent_id = a.id
        WHERE i.id = ?
      `;

      const inspections = await database.query(sql, [id]);
      if (inspections.length === 0) return null;

      const inspection = inspections[0];
      const items = await database.findAll('inspection_items', 'inspection_id = ?', [id]);
      const mediaFiles = await database.findAll('media_files', 'inspection_id = ?', [id]);

      const inspectionItems: InspectionItemType[] = items.map((item) => ({
        id: item.id,
        category: item.category,
        item: item.item,
        condition: item.condition as any,
        notes: item.notes,
        photos: mediaFiles.filter(m => m.type === 'photo' && m.inspection_item_id === item.id).map(m => m.uri),
        videos: mediaFiles.filter(m => m.type === 'video' && m.inspection_item_id === item.id).map(m => m.uri)
      }));

      return {
        id: inspection.id,
        propertyId: inspection.property_id,
        property: {
          id: inspection.property_id,
          address: inspection.address,
          type: inspection.property_type as any,
          bedrooms: inspection.bedrooms,
          bathrooms: inspection.bathrooms,
          area: inspection.area,
          rentPrice: inspection.rent_price,
          deposit: inspection.deposit
        },
        clientId: inspection.client_id,
        client: {
          id: inspection.client_id,
          name: inspection.client_name,
          email: inspection.client_email,
          phone: inspection.client_phone,
          type: inspection.client_type as any
        },
        agentId: inspection.agent_id,
        agent: {
          id: inspection.agent_id,
          name: inspection.agent_name,
          email: inspection.agent_email,
          phone: inspection.agent_phone,
          avatar: inspection.agent_avatar
        },
        type: inspection.type as any,
        status: inspection.status as any,
        scheduledDate: new Date(inspection.scheduled_date).toISOString(),
        completedDate: inspection.completed_date ? new Date(inspection.completed_date).toISOString() : undefined,
        items: inspectionItems,
        generalNotes: inspection.general_notes,
        // Signatures are now stored only on backend, not locally
        tenantSignature: undefined,
        agentSignature: undefined,
        reportUrl: inspection.report_url,
        photos: mediaFiles.filter(m => m.type === 'photo' && !m.inspection_item_id).map(m => m.uri),
        videos: mediaFiles.filter(m => m.type === 'video' && !m.inspection_item_id).map(m => m.uri)
      };
    } catch (error) {
      console.error('Failed to get inspection by id:', error);
      return null;
    }
  }

  public async updateInspection(inspectionData: InspectionType): Promise<void> {
    try {
      await database.init();

      // Update inspection using offline-first approach
      const updateData = {
        status: inspectionData.status,
        completed_date: inspectionData.completedDate ? new Date(inspectionData.completedDate).getTime() : null,
        general_notes: inspectionData.generalNotes,
        // Signatures are now stored only on backend, not locally
        tenant_signature: null,
        agent_signature: null,
        report_url: inspectionData.reportUrl,
        updated_at: Date.now()
      };

      await offlineApiService.update('inspections', inspectionData.id, updateData);

      // Update inspection items
      if (inspectionData.items && inspectionData.items.length > 0) {
        // Delete existing items
        await database.execute('DELETE FROM inspection_items WHERE inspection_id = ?', [inspectionData.id]);

        // Create new items
        for (const itemData of inspectionData.items) {
          const itemRecord = {
            id: database.generateId(),
            inspection_id: inspectionData.id,
            category: itemData.category,
            item: itemData.item,
            condition: itemData.condition,
            notes: itemData.notes,
            created_at: Date.now(),
            updated_at: Date.now()
          };
          
          await database.insert('inspection_items', itemRecord);
          
          // Queue for sync
          await offlineApiService.queueOperation('inspection_items', 'CREATE', itemRecord);
        }
      }
    } catch (error) {
      console.error('Failed to update inspection:', error);
      throw error;
    }
  }

  public async authenticateUser(email: string, password: string): Promise<UserType | null> {
    try {
      await database.init();

      // Check if user exists in database
      const existingUsers = await database.findAll('users', 'email = ?', [email]);

      if (existingUsers.length > 0) {
        const user = existingUsers[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company: user.company
        };
      }

      // No user found - authentication failed
      return null;
    } catch (error) {
      console.error('Failed to authenticate user:', error);
      return null;
    }
  }

  public async getStoredUser(): Promise<UserType | null> {
    try {
      await database.init();
      const users = await database.findAll('users');
      if (users.length > 0) {
        const user = users[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as any,
          company: user.company
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get stored user:', error);
      return null;
    }
  }

  public async logout(): Promise<void> {
    try {
      await database.init();
      await database.execute('DELETE FROM users');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }
}