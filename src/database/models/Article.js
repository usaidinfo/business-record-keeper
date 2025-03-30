// src/database/models/Article.js
import { Model } from '@nozbe/watermelondb'
import { field, date, relation } from '@nozbe/watermelondb/decorators'

export default class Article extends Model {
  static table = 'articles'
  static associations = {
    businesses: { type: 'belongs_to', key: 'business_id' }
  }

  @field('name') name
  @field('qty') qty
  @field('selling_price') sellingPrice
  @relation('businesses', 'business_id') business
  @date('created_at') createdAt
  @date('updated_at') updatedAt
}