import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Client extends Model {
  static table = 'clients';

  @field('name') name!: string;
  @field('email') email!: string;
  @field('phone') phone!: string;
  @field('type') type!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}