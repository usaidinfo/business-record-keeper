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

export const COUCHDB_URL = 'https://5cb9-2405-201-3037-e053-e88a-9fe7-4c12-bbb5.ngrok-free.app/';

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
      return false;
    }
  }
  
  async syncBusinesses() {
    try {
      const db = await getDatabase();
      const businesses = await db.businesses.find().exec();
      
      const unsynced = businesses.filter(b => !(b as any)._rev);
      console.log(`Found ${unsynced.length} unsynced businesses`);
      
      if (unsynced.length === 0) {
        return true;
      }
  
      for (const business of unsynced) {
        try {
          const response = await fetch(`${COUCHDB_URL}business`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Basic ' + btoa('usaid:beast617796')
            },
            body: JSON.stringify({
              _id: business.id,
              name: business.name
            })
          });
  
          if (response.ok) {
            const responseData = await response.json();
            await business.update({
              $set: {
                _rev: responseData.rev
              }
            });
            console.log(`Synced business ${business.id} to server`);
          }
        } catch (error) {
          console.log(`Failed to sync business ${business.id}:`, error);
        }
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
      
      // Get only articles that don't have a _rev (not synced to server yet)
      const unsynced = articles.filter(a => !(a as any)._rev);
      if (unsynced.length === 0) {
        return true;
      }
  
      console.log(`Attempting to sync ${unsynced.length} unsynced articles to CouchDB...`);
      
      const response = await fetch(`${COUCHDB_URL}articles/_bulk_docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        },
        body: JSON.stringify({
          docs: unsynced.map(a => ({
            _id: a.id,
            name: a.name,
            qty: a.qty,
            selling_price: a.selling_price,
            business_id: a.business_id
          }))
        })
      });
  
      const responseData = await response.json();
      
      // Update local articles with new _rev from server
      if (response.ok) {
        for (let i = 0; i < unsynced.length; i++) {
          const article = unsynced[i];
          const serverResponse = responseData[i];
          if (serverResponse.ok) {
            await article.update({
              $set: {
                _rev: serverResponse.rev
              }
            });
          }
        }
      }
  
      return response.ok;
    } catch (error) {
      console.error('Failed to sync articles:', error);
      return false;
    }
  }

  async fetchBusinessesFromServer() {
    try {
      const response = await fetch(`${COUCHDB_URL}business/_all_docs?include_docs=true`, {
        headers: {
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        }
      });
  
      if (!response.ok) {
        console.log('Failed to fetch businesses from server');
        return false;
      }
  
      const data = await response.json();
      const db = await getDatabase();
      
      for (const row of data.rows) {
        const doc = row.doc;
        if (doc) {
          // Check if business exists
          const existing = await db.businesses.findOne(doc._id).exec();
          if (existing) {
            await existing.update({
              $set: {
                name: doc.name,
                _rev: doc._rev
              }
            });
          } else {
            await db.businesses.insert({
              id: doc._id,
              name: doc.name,
            //@ts-ignore
              _rev: doc._rev as string
            });
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error fetching businesses:', error);
      return false;
    }
  }
  
  async fetchArticlesFromServer() {
    try {
      const response = await fetch(`${COUCHDB_URL}articles/_all_docs?include_docs=true`, {
        headers: {
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        }
      });
  
      if (!response.ok) {
        console.log('Failed to fetch articles from server');
        return false;
      }
  
      const data = await response.json();
      const db = await getDatabase();
      
      for (const row of data.rows) {
        const doc = row.doc;
        if (doc) {
          // Check if article exists
          const existing = await db.articles.findOne(doc._id).exec();
          if (existing) {
            await existing.update({
              $set: {
                name: doc.name,
                qty: doc.qty,
                selling_price: doc.selling_price,
                business_id: doc.business_id,
                _rev: doc._rev
              }
            });
          } else {
            await db.articles.insert({
              id: doc._id,
              name: doc.name,
              qty: doc.qty,
              selling_price: doc.selling_price,
              business_id: doc.business_id,
              //@ts-ignore
              _rev: doc._rev
            });
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error fetching articles:', error);
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

      await this.fetchBusinessesFromServer();
      await this.fetchArticlesFromServer();
      
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
      // First try server if online
      const response = await fetch(`${COUCHDB_URL}business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + btoa('usaid:beast617796')
        },
        body: JSON.stringify({
          _id: business._id,
          name: business.name
        })
      });
  
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
  
      const responseData = await response.json();
      
      return responseData;
    } catch (error) {
      throw error;
    }
  }

  async updateBusiness(business: BusinessDoc) {
    try {
      const db = await getDatabase();
      
      let serverRev = null;
      try {
        const getResponse = await fetch(`${COUCHDB_URL}business/${business._id}`, {
          headers: {
            'Authorization': 'Basic ' + btoa('usaid:beast617796')
          }
        });
  
        if (getResponse.ok) {
          const serverDoc = await getResponse.json();
          // Update using server's latest revision
          const response = await fetch(`${COUCHDB_URL}business/${business._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Basic ' + btoa('usaid:beast617796')
            },
            body: JSON.stringify({
              ...business,
              _rev: serverDoc._rev
            })
          });
  
          if (response.ok) {
            const responseData = await response.json();
            serverRev = responseData.rev;
          }
        }
      } catch (error) {
        console.log('Server update failed, updating locally only:', error);
      }
  
      // Update local database
      const existingBusiness = await db.businesses.findOne(business._id).exec();
      if (existingBusiness) {
        await existingBusiness.update({
          $set: {
            name: business.name,
            _rev: serverRev || existingBusiness.get('_rev')
          }
        });
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
        try {
          try {
            const getArtResponse = await fetch(`${COUCHDB_URL}articles/${article.id}`, {
              headers: { 'Authorization': 'Basic ' + btoa('usaid:beast617796') }
            });
            
            if (getArtResponse.ok) {
              const serverArt = await getArtResponse.json();
              await fetch(`${COUCHDB_URL}articles/${article.id}?rev=${serverArt._rev}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Basic ' + btoa('usaid:beast617796') }
              });
            }
          } catch (err) {
            console.log(`Server article delete failed: ${err}`);
          }
          
          await article.remove();
        } catch (error) {
          console.log(`Error deleting article ${article.id}:`, error);
        }
      }
  
      let serverDeleted = false;
      try {
        const getResponse = await fetch(`${COUCHDB_URL}business/${businessId}`, {
          headers: { 'Authorization': 'Basic ' + btoa('usaid:beast617796') }
        });
  
        if (getResponse.ok) {
          const serverDoc = await getResponse.json();
          const deleteResponse = await fetch(`${COUCHDB_URL}business/${businessId}?rev=${serverDoc._rev}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Basic ' + btoa('usaid:beast617796') }
          });
          serverDeleted = deleteResponse.ok;
        }
      } catch (error) {
        console.log('Server delete failed:', error);
      }
  
      const business = await db.businesses.findOne(businessId).exec();
      if (business) {
        await business.remove();
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
  
//   async resetLocalData() {
//     try {
//       const db = await getDatabase();
      
//       // Remove all businesses and articles from RxDB
//       if (db.businesses) {
//         await db.businesses.remove({});
//       }
//       if (db.articles) {
//         await db.articles.remove({});
//       }
  
//       // Clear specific AsyncStorage keys
//       const AsyncStorage = require('@react-native-async-storage/async-storage').default;
//       const keys = await AsyncStorage.getAllKeys();
//       const businessAndArticleKeys = keys.filter(key => 
//         key.includes('business') || key.includes('article')
//       );
//       await AsyncStorage.multiRemove(businessAndArticleKeys);
      
//       console.log('Local data reset successfully');
//       return true;
//     } catch (error) {
//       console.error('Failed to reset local data:', error);
//       return false;
//     }
//   }
}   

export default new ReplicationService();