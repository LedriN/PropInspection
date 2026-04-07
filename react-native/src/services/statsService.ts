import { ApiClient } from '../config/api';

export interface UserStats {
  inspections: number;
  properties: number;
  reports: number;
  todayCount: number;
  completedCount: number;
  recentReports: any[];
}

export interface StatsResponse {
  success: boolean;
  data: UserStats;
  message?: string;
}

export class StatsService {
  private static instance: StatsService;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  public static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  /**
   * Get user statistics (inspections, properties, reports count)
   */
  public async getUserStats(): Promise<UserStats> {
    try {
      console.log('Fetching user statistics...');
      const response = await this.apiClient.get<StatsResponse>('/stats/user');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch user statistics');
      }

      console.log('User statistics fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      // Return default values if API call fails
      return {
        inspections: 0,
        properties: 0,
        reports: 0
      };
    }
  }

  /**
   * Get inspections count for current user
   */
  public async getInspectionsCount(): Promise<number> {
    try {
      const response = await this.apiClient.get<{ data: any[] }>('/inspections');
      const inspections = response.data || [];
      
      // Filter inspections assigned to current user and not completed
      const userInspections = inspections.filter(inspection => {
        // This logic should match the filtering logic in SchedulesScreen
        // For now, we'll count all inspections for the user
        return !inspection.isCompleted && inspection.status !== 'completed';
      });
      
      return userInspections.length;
    } catch (error) {
      console.error('Error fetching inspections count:', error);
      return 0;
    }
  }

  /**
   * Get properties count for current user
   */
  public async getPropertiesCount(): Promise<number> {
    try {
      const response = await this.apiClient.get<{ data: any[] }>('/properties');
      const properties = response.data || [];
      return properties.length;
    } catch (error) {
      console.error('Error fetching properties count:', error);
      return 0;
    }
  }

  /**
   * Get reports count for current user
   */
  public async getReportsCount(): Promise<number> {
    try {
      const response = await this.apiClient.get<{ data: any[] }>('/reports');
      const reports = response.data || [];
      return reports.length;
    } catch (error) {
      console.error('Error fetching reports count:', error);
      return 0;
    }
  }

  /**
   * Get today's inspections count for current user
   */
  public async getTodayCount(): Promise<number> {
    try {
      const response = await this.apiClient.get<{ data: any[] }>('/inspections');
      const inspections = response.data || [];
      
      const today = new Date().toDateString();
      const todayInspections = inspections.filter(inspection => {
        return new Date(inspection.scheduledDate).toDateString() === today;
      });
      
      return todayInspections.length;
    } catch (error) {
      console.error('Error fetching today count:', error);
      return 0;
    }
  }

  /**
   * Get completed inspections count for current user
   */
  public async getCompletedCount(): Promise<number> {
    try {
      const response = await this.apiClient.get<{ data: any[] }>('/inspections');
      const inspections = response.data || [];
      
      const completedInspections = inspections.filter(inspection => {
        return inspection.status === 'completed';
      });
      
      return completedInspections.length;
    } catch (error) {
      console.error('Error fetching completed count:', error);
      return 0;
    }
  }

  /**
   * Get recent reports for current user (last 5)
   */
  public async getRecentReports(): Promise<any[]> {
    try {
      const response = await this.apiClient.get<{ data: any[] }>('/reports');
      const reports = response.data || [];
      
      // Sort by date and get last 5
      const recentReports = reports
        .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
        .slice(0, 5)
        .map(report => ({
          id: report._id,
          title: report.title || report.reportType || 'Untitled Report',
          property: report.property_name || 
            (report.property_id?.address?.street) || 
            (typeof report.property_id === 'string' ? `Property ID: ${report.property_id}` : 'Property Address'),
          client: report.client_name || 
            (report.client_id?.firstName && report.client_id?.lastName ? `${report.client_id.firstName} ${report.client_id.lastName}` : '') ||
            (typeof report.client_id === 'string' ? `Client ID: ${report.client_id}` : 'Client Name'),
          agent: report.agent_name || 
            (report.agent_id?.firstName && report.agent_id?.lastName ? `${report.agent_id.firstName} ${report.agent_id.lastName}` : '') ||
            (typeof report.agent_id === 'string' ? `Agent ID: ${report.agent_id}` : 'Agent Name'),
          type: report.reportType || report.type || 'inspection',
          date: report.createdAt ? new Date(report.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
          status: report.status || 'Draft',
          propertyId: report.property_id,
          clientId: report.client_id,
          agentId: report.agent_id
        }));
      
      return recentReports;
    } catch (error) {
      console.error('Error fetching recent reports:', error);
      return [];
    }
  }

  /**
   * Get all statistics in one call
   */
  public async getAllStats(): Promise<UserStats> {
    try {
      const [inspections, properties, reports, todayCount, completedCount, recentReports] = await Promise.all([
        this.getInspectionsCount(),
        this.getPropertiesCount(),
        this.getReportsCount(),
        this.getTodayCount(),
        this.getCompletedCount(),
        this.getRecentReports()
      ]);

      return {
        inspections,
        properties,
        reports,
        todayCount,
        completedCount,
        recentReports
      };
    } catch (error) {
      console.error('Error fetching all statistics:', error);
      return {
        inspections: 0,
        properties: 0,
        reports: 0,
        todayCount: 0,
        completedCount: 0,
        recentReports: []
      };
    }
  }
}

export default StatsService;
