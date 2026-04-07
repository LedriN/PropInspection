import { Model } from '@nozbe/watermelondb';
import { field, date, relation, children } from '@nozbe/watermelondb/decorators';
import Inspection from './Inspection';
import MediaFile from './MediaFile';

export default class InspectionItem extends Model {
  static table = 'inspection_items';

  static associations = {
    inspections: { type: 'belongs_to', key: 'inspection_id' },
    media_files: { type: 'has_many', foreignKey: 'inspection_item_id' },
  } as const;

  @field('inspection_id') inspectionId!: string;
  @field('category') category!: string;
  @field('item') item!: string;
  @field('condition') condition!: string;
  @field('notes') notes?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('inspections', 'inspection_id') inspection!: Inspection;
  @children('media_files') mediaFiles!: MediaFile[];
}