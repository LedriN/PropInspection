import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Agent extends Model {
  static table = 'agents';

  @field('name') name!: string;
  @field('email') email!: string;
  @field('phone') phone!: string;
  @field('avatar') avatar?: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}