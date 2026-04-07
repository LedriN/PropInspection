import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'email', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'company', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'properties',
      columns: [
        { name: 'address', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'bedrooms', type: 'number', isOptional: true },
        { name: 'bathrooms', type: 'number', isOptional: true },
        { name: 'area', type: 'number', isOptional: true },
        { name: 'rent_price', type: 'number' },
        { name: 'deposit', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'clients',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'agents',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'avatar', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'inspections',
      columns: [
        { name: 'property_id', type: 'string', isIndexed: true },
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'agent_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'scheduled_date', type: 'number' },
        { name: 'completed_date', type: 'number', isOptional: true },
        { name: 'general_notes', type: 'string', isOptional: true },
        { name: 'tenant_signature', type: 'string', isOptional: true },
        { name: 'agent_signature', type: 'string', isOptional: true },
        { name: 'report_url', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'inspection_items',
      columns: [
        { name: 'inspection_id', type: 'string', isIndexed: true },
        { name: 'category', type: 'string' },
        { name: 'item', type: 'string' },
        { name: 'condition', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'media_files',
      columns: [
        { name: 'inspection_id', type: 'string', isIndexed: true },
        { name: 'inspection_item_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'type', type: 'string' }, // 'photo' or 'video'
        { name: 'uri', type: 'string' },
        { name: 'filename', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'reports',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'report_type', type: 'string' },
        { name: 'property_id', type: 'string', isIndexed: true },
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'agent_id', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' }, // JSON string
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'generated_at', type: 'number' },
        { name: 'generated_by', type: 'string' },
        { name: 'property_name', type: 'string' },
        { name: 'client_name', type: 'string' },
        { name: 'agent_name', type: 'string' },
        { name: 'agent_email', type: 'string', isOptional: true },
        { name: 'client_email', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean', isIndexed: true },
        { name: 'sync_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});