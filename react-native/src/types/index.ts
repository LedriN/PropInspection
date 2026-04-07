export interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

export interface Property {
  id: string;
  address: string;
  type: 'apartment' | 'house' | 'studio' | 'commercial';
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  rentPrice: number;
  deposit: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'landlord' | 'tenant' | 'agent';
}

export interface InspectionItem {
  id: string;
  category: string;
  item: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  notes?: string;
  photos?: string[];
  videos?: string[];
}

export interface Inspection {
  id: string;
  propertyId: string;
  property: Property;
  clientId: string;
  client: Client;
  agentId: string;
  agent: Agent;
  type: 'move-in' | 'move-out' | 'periodic' | 'maintenance';
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'scheduled' | 'pending' | 'overdue';
  scheduledDate: string;
  completedDate?: string;
  items: InspectionItem[];
  generalNotes?: string;
  tenantSignature?: string;
  agentSignature?: string;
  reportUrl?: string;
  photos?: string[];
  videos?: string[];
}

export interface Report {
  id: string;
  title: string;
  propertyId: string;
  property: Property;
  clientId: string;
  client: Client;
  agentId: string;
  agent: Agent;
  type: 'inspection' | 'defect' | 'summary' | 'agreement';
  status: 'completed' | 'draft' | 'pending';
  generatedAt: string;
  reportUrl?: string;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'agent' | 'admin';
  company: string;
  databaseName?: string;
  username?: string;
}