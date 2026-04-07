import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Property extends Model {
  static table = 'properties';

  @field('address') address!: string;
  @field('type') type!: string;
  @field('bedrooms') bedrooms?: number;
  @field('bathrooms') bathrooms?: number;
  @field('area') area?: number;
  @field('rent_price') rentPrice!: number;
  @field('deposit') deposit!: number;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}