// src/database/index.ts
import 'react-native-get-random-values';
import { createRxDatabase, addRxPlugin, RxCollection, RxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { businessSchema, Business } from './models/businessSchema';
import { articleSchema, Article } from './models/articleSchema';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { COUCHDB_URL } from '../services/ReplicationService';
import NetworkService from '~/services/NetworkService';

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBUpdatePlugin);

function customHashFunction(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Promise.resolve(hash.toString());
}

export type BusinessRecordDatabase = {
  businesses: RxCollection<Business>;
  articles: RxCollection<Article>;
};

let dbPromise: Promise<RxDatabase<BusinessRecordDatabase>> | null = null;

async function setupPersistence(db: RxDatabase<BusinessRecordDatabase>) {
  db.businesses.$.subscribe(async () => {
    try {
      const allBusinesses = await db.businesses.find().exec();
      const businessData = allBusinesses.map(b => ({
        id: b.id,
        name: b.name
      }));
      await AsyncStorage.setItem('businesses', JSON.stringify(businessData));
      console.log('Businesses saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving businesses:', error);
    }
  });
  
  db.articles.$.subscribe(async () => {
    try {
      const allArticles = await db.articles.find().exec();
      const articleData = allArticles.map(a => ({
        id: a.id,
        name: a.name,
        qty: a.qty,
        selling_price: a.selling_price,
        business_id: a.business_id
      }));
      await AsyncStorage.setItem('articles', JSON.stringify(articleData));
      console.log('Articles saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving articles:', error);
    }
  });
}

async function loadPersistedData(db: RxDatabase<BusinessRecordDatabase>) {
  try {
    const businessesJSON = await AsyncStorage.getItem('businesses');
    if (businessesJSON) {
      const businesses = JSON.parse(businessesJSON);
      console.log(`Loading ${businesses.length} businesses from storage`);
      
      for (const business of businesses) {
        try {
          await db.businesses.upsert(business);
        } catch (err) {
          console.log('Error inserting business:', err);
        }
      }
    }
    
    const articlesJSON = await AsyncStorage.getItem('articles');
    if (articlesJSON) {
      const articles = JSON.parse(articlesJSON);
      console.log(`Loading ${articles.length} articles from storage`);
      
      for (const article of articles) {
        try {
          await db.articles.upsert(article);
        } catch (err) {
          console.log('Error inserting article:', err);
        }
      }
    }
    
    console.log('Persisted data loaded successfully');
  } catch (error) {
    console.error('Error loading persisted data:', error);
  }
}

async function syncWithServer(db: RxDatabase<BusinessRecordDatabase>) {
  try {
    // First try to fetch from server
    const [serverBusinesses, serverArticles] = await Promise.all([
      fetch(`${COUCHDB_URL}business/_all_docs?include_docs=true`, {
        headers: { 'Authorization': 'Basic ' + btoa('usaid:beast617796') }
      }).then(r => r.json()).catch(() => ({ rows: [] })),
      fetch(`${COUCHDB_URL}articles/_all_docs?include_docs=true`, {
        headers: { 'Authorization': 'Basic ' + btoa('usaid:beast617796') }
      }).then(r => r.json()).catch(() => ({ rows: [] }))
    ]);

    // Get local data
    const localBusinesses = JSON.parse(await AsyncStorage.getItem('businesses') || '[]');
    const localArticles = JSON.parse(await AsyncStorage.getItem('articles') || '[]');

    // Sync businesses
    for (const business of localBusinesses) {
      const serverBusiness = serverBusinesses.rows.find((r: { doc: { _id: any; }; }) => r.doc?._id === business.id);
      if (!serverBusiness) {
        // Business exists locally but not on server - add it
        await fetch(`${COUCHDB_URL}business`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa('usaid:beast617796')
          },
          body: JSON.stringify({ _id: business.id, ...business })
        });
      }
    }

    // Sync articles
    for (const article of localArticles) {
      const serverArticle = serverArticles.rows.find((r: { doc: { _id: any; }; }) => r.doc?._id === article.id);
      if (!serverArticle) {
        // Article exists locally but not on server - add it
        await fetch(`${COUCHDB_URL}articles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa('usaid:beast617796')
          },
          body: JSON.stringify({ _id: article.id, ...article })
        });
      }
    }

    // Update local database with server data
    await loadPersistedData(db);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

export const getDatabase = async () => {
  if (dbPromise) return dbPromise;

  try {
    console.log("Creating database...");
    dbPromise = createRxDatabase<BusinessRecordDatabase>({
      name: 'businessrecordkeeperdb',
      storage: wrappedValidateAjvStorage({
        storage: getRxStorageMemory()
      }),
      ignoreDuplicate: true,
      hashFunction: customHashFunction
    });

    const db = await dbPromise;
    
    console.log("Adding collections...");
    await db.addCollections({
      businesses: {
        schema: businessSchema
      },
      articles: {
        schema: articleSchema
      }
    });
    
    setupPersistence(db);
    await loadPersistedData(db);
    await syncWithServer(db); // Initial sync attempt
    
    // Setup automatic sync when network changes
    NetworkService.addListener(async (isOnline: boolean) => {
      if (isOnline) {
        await syncWithServer(db);
      }
    });
    
    console.log("Database setup complete");
    return db;
  } catch (error) {
    console.error("Database initialization error:", error);
    dbPromise = null;
    throw error;
  }
};