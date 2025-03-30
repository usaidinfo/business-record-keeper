import { RxCollection, RxDatabase } from 'rxdb';
import { Business } from '../database/models/businessSchema';
import { Article } from '../database/models/articleSchema';

export type MyDatabaseCollections = {
  businesses: RxCollection<Business>;
  articles: RxCollection<Article>;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;