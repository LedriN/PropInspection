import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @field('email') email!: string;
  @field('name') name!: string;
  @field('role') role!: string;
  @field('company') company!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}