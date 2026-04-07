import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import Inspection from './Inspection';
import InspectionItem from './InspectionItem';

export default class MediaFile extends Model {
  static table = 'media_files';

  static associations = {
    inspections: { type: 'belongs_to', key: 'inspection_id' },
    inspection_items: { type: 'belongs_to', key: 'inspection_item_id' },
  } as const;

  @field('inspection_id') inspectionId!: string;
  @field('inspection_item_id') inspectionItemId?: string;
  @field('type') type!: string; // 'photo' or 'video'
  @field('uri') uri!: string;
  @field('filename') filename!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('inspections', 'inspection_id') inspection!: Inspection;
  @relation('inspection_items', 'inspection_item_id') inspectionItem?: InspectionItem;
}