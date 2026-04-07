import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import Property from './Property';
import Client from './Client';
import Agent from './Agent';

export default class Report extends Model {
  static table = 'reports';

  static associations = {
    properties: { type: 'belongs_to', key: 'property_id' },
    clients: { type: 'belongs_to', key: 'client_id' },
    agents: { type: 'belongs_to', key: 'agent_id' },
  } as const;

  @field('title') title!: string;
  @field('report_type') reportType!: string;
  @field('property_id') propertyId!: string;
  @field('client_id') clientId!: string;
  @field('agent_id') agentId!: string;
  @field('content') content!: string; // JSON string
  @field('status') status!: string;
  @date('generated_at') generatedAt!: Date;
  @field('generated_by') generatedBy!: string;
  @field('property_name') propertyName!: string;
  @field('client_name') clientName!: string;
  @field('agent_name') agentName!: string;
  @field('agent_email') agentEmail?: string;
  @field('client_email') clientEmail?: string;
  @field('is_synced') isSynced!: boolean;
  @field('sync_error') syncError?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('properties', 'property_id') property!: Property;
  @relation('clients', 'client_id') client!: Client;
  @relation('agents', 'agent_id') agent!: Agent;

  // Helper method to get parsed content
  get parsedContent() {
    try {
      return JSON.parse(this.content);
    } catch {
      return {};
    }
  }

  // Helper method to set content from object
  setContent(content: any) {
    this.content = JSON.stringify(content);
  }
}
