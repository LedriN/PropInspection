import { Model } from '@nozbe/watermelondb';
import { field, date, relation, children } from '@nozbe/watermelondb/decorators';
import Property from './Property';
import Client from './Client';
import Agent from './Agent';
import InspectionItem from './InspectionItem';
import MediaFile from './MediaFile';

export default class Inspection extends Model {
  static table = 'inspections';

  static associations = {
    properties: { type: 'belongs_to', key: 'property_id' },
    clients: { type: 'belongs_to', key: 'client_id' },
    agents: { type: 'belongs_to', key: 'agent_id' },
    inspection_items: { type: 'has_many', foreignKey: 'inspection_id' },
    media_files: { type: 'has_many', foreignKey: 'inspection_id' },
  } as const;

  @field('property_id') propertyId!: string;
  @field('client_id') clientId!: string;
  @field('agent_id') agentId!: string;
  @field('type') type!: string;
  @field('status') status!: string;
  @date('scheduled_date') scheduledDate!: Date;
  @date('completed_date') completedDate?: Date;
  @field('general_notes') generalNotes?: string;
  @field('tenant_signature') tenantSignature?: string;
  @field('agent_signature') agentSignature?: string;
  @field('report_url') reportUrl?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('properties', 'property_id') property!: Property;
  @relation('clients', 'client_id') client!: Client;
  @relation('agents', 'agent_id') agent!: Agent;
  @children('inspection_items') items!: InspectionItem[];
  @children('media_files') mediaFiles!: MediaFile[];
}