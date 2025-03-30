// src/database/models/Business.js
import { Model } from '@nozbe/watermelondb'
import { field, date, children } from '@nozbe/watermelondb/decorators'

export default class Business extends Model {
  static table = 'businesses'
  static associations = {
    articles: { type: 'has_many', foreignKey: 'business_id' }
  }

  @field('name') name
  @date('created_at') createdAt
  @date('updated_at') updatedAt
  @children('articles') articles
}