// src/services/ReplicationService.ts
import crossFetch from 'cross-fetch';
import { getDatabase } from '../database';
import NetworkService from './NetworkService';

interface BusinessDoc {
    _id: string;
    _rev?: string;
    name: string;
  }

  interface ArticleDoc {
    _id: string;
    _rev?: string;
    name: string;
    qty: number;
    selling_price: number;
    business_id: string;
  }

const COUCHDB_URL = 'https://d594-2405-201-3037-e053-e88a-9fe7-4c12-bbb5.ngrok-free.app/';

class ReplicationService {
  isReplicating = false;
  
  
  constructor() {
    NetworkService.addListener(this.handleNetworkChange.bind(this));
    setTimeout(() => {
      console.log('Attempting initial sync...');
      this.startReplication();
    }, 2000);
  }
  
  async testConnection() {
    try {
      console.log(`Testing connection to CouchDB at ${COUCHDB_URL}...`);
      
      const response = await fetch(COUCHDB_URL, {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.log('CouchDB connection failed with status:', response.status);
        return false;
      }
  
      const data = await response.json();
      console.log('Connection test successful:', data);
      return data && data.couchdb === "Welcome";
    } catch (error) {
      console.error('Connection failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
  
  async syncBusinesses() {
    try {
      const db = await getDatabase();
      const businesses = await db.businesses.find().exec();

      console.log(`Attempting to sync ${businesses.length} businesses to CouchDB...`);

      const response = await fetch(`${COUCHDB_URL}business/_bulk_docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        },
        body: JSON.stringify({
          docs: businesses.map(b => ({
            _id: b.id,
            _rev: (b as any)._rev,
            name: b.name
          }))
        })
      });

      const responseText = await response.text();
      console.log(`Sync response: ${response.status}, ${responseText}`);

      if (!response.ok) {
            console.log('Sync failed with status:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to sync businesses:', error);
      return false;
    }
  }
  
  async syncArticles() {
    try {
      const db = await getDatabase();
      const articles = await db.articles.find().exec();
      
      console.log(`Attempting to sync ${articles.length} articles to CouchDB...`);
      
      const response = await fetch(`${COUCHDB_URL}articles/_bulk_docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        },
        body: JSON.stringify({
          docs: articles.map(a => ({
            _id: a.id,
            name: a.name,
            qty: a.qty,
            selling_price: a.selling_price,
            business_id: a.business_id
          }))
        })
      });
      
      const responseText = await response.text();
      console.log(`Article sync response: ${response.status}, ${responseText}`);
      
      if (!response.ok) {
        console.log('sync error, failed to sync articles')
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to sync articles:', error);
      return false;
    }
  }
  
  async startReplication() {
    if (this.isReplicating) {
      console.log('Clearing previous sync lock');
      this.isReplicating = false;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isReplicating = true;
    console.log('Starting manual sync process...');

    try {
      const connected = await this.testConnection();
      if (!connected) {
        console.log('Connection test failed, aborting sync');
        this.isReplicating = false;
        return;
      }

      await this.syncBusinesses();
      await this.syncArticles();
      console.log('Manual sync completed');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isReplicating = false;
    }
  }

  async createBusiness(business: any) {
    try {
      const response = await fetch(`${COUCHDB_URL}business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        },
        body: JSON.stringify(business)
      });
  
      const responseText = await response.text();
      console.log(`Create response: ${response.status}, ${responseText}`);
  
      if (!response.ok) {
        console.log('Create error', `failed to create business: ${response.status}` )
        return false;
      }
  
      return true;
    } catch (error) {
      console.error('Failed to create business:', error);
      return false;
    }
  }

  async updateBusiness(business: BusinessDoc) {
    try {
      const response = await fetch(`${COUCHDB_URL}business/${business._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        },
        body: JSON.stringify(business)
      });
  
      const responseText = await response.text();
      console.log(`Update response: ${response.status}, ${responseText}`);
  
      if (!response.ok) {
        console.log('Update Error', `Failed to update business: ${response.status}`)
        return false;
      }
  
      return true;
    } catch (error) {
      console.error('Failed to update business:', error);
      return false;
    }
  }
  
  async deleteBusiness(businessId: string, businessRev: string) {
    try {
      const db = await getDatabase();
      const articles = await db.articles.find().where('business_id').eq(businessId).exec();
      
      for (const article of articles) {
        await article.remove();
        
        try {
          const response = await fetch(`${COUCHDB_URL}articles/${article.id}?rev=${article.get('_rev')}`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Basic ' + btoa('usaid:beast617796')
            }
          });
          
          if (!response.ok) {
            console.log(`Article ${article.id} already deleted from server or not found`);
          }
        } catch (error) {
          console.log(`Skipping server delete for article ${article.id}`);
        }
      }
  
      const business = await db.businesses.findOne(businessId).exec();
      if (business) {
        await business.remove();
      }
  
      const response = await fetch(`${COUCHDB_URL}business/${businessId}?rev=${businessRev}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        }
      });
  
      if (!response.ok) {
        console.log('Business might already be deleted from server');
      }
  
      return true;
    } catch (error) {
      console.error('Failed to delete business:', error);
      return false;
    }
  }

  async createArticle(article: ArticleDoc) {
    try {
      const response = await fetch(`${COUCHDB_URL}articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        },
        body: JSON.stringify(article)
      });
  
      const responseText = await response.text();
      console.log(`Create article response: ${response.status}, ${responseText}`);
  
      if (!response.ok) {
        console.log('Create  error', `failed to create article: ${response.status}` )
        return false;
      }
  
      return true;
    } catch (error) {
      console.error('Failed to create article:', error);
      return false;
    }
  }
  
  handleNetworkChange(isOnline: boolean) {
    console.log(`Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
    if (isOnline) {
      console.log('Network is available, starting sync');
      this.startReplication();
    } else {
      console.log('Network unavailable, working offline');
    }
  }
  
//   async resetAllData() {
//     try {
//       const db = await getDatabase();
      
//       // First clear AsyncStorage
//       const AsyncStorage = require('@react-native-async-storage/async-storage').default;
//       await AsyncStorage.clear();
      
//       // Remove all documents if collections exist
//       if (db.businesses) {
//         await db.businesses.remove({});
//       }
//       if (db.articles) {
//         await db.articles.remove({});
//       }
      
//       // Destroy the current database
//       await db.destroy();
      
//       // Force a new database initialization
//       const newDb = await getDatabase();
      
//       // Create new collections
//       await newDb.addCollections({
//         businesses: {
//           schema: require('../database/models/businessSchema').default
//         },
//         articles: {
//           schema: require('../database/models/articleSchema').default
//         }
//       });
      
//       console.log('Database reset and reinitialized successfully');
//       Alert.alert('Success', 'Database has been reset. Please restart the app.');
//       return true;
//     } catch (error) {
//       console.error('Failed to reset data:', error);
//       Alert.alert('Error', `Failed to reset data: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       return false;
//     }
//   }
}

export default new ReplicationService();