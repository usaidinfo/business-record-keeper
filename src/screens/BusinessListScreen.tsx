import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { getDatabase } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { BusinessListScreenProps } from '../types/navigation';
import { Business } from '../database/models/businessSchema';
import { RxDocument } from 'rxdb';
import { Ionicons } from '@expo/vector-icons';
import ReplicationService from '../services/ReplicationService';

type BusinessDocument = RxDocument<Business>;

const BusinessListScreen: React.FC<BusinessListScreenProps> = ({ navigation }) => {
  const [businesses, setBusinesses] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessDocument | null>(null);

  useEffect(() => {
    loadBusinesses();
  }, []);


  

  const loadBusinesses = async () => {
    try {
      const db = await getDatabase();
      if (!db || !db.businesses) {
        console.log('Database or businesses collection not available');
        setLoading(false);
        return;
      }
      const results = await db.businesses.find().exec();
      setBusinesses(results);
      setLoading(false);
    } catch (error) {
      console.error('Error loading businesses:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load businesses. Please restart the app.');
    }
  };

  const handleAddBusiness = async () => {
    if (!newBusinessName.trim()) {
      Alert.alert('Error', 'Business name cannot be empty');
      return;
    }
    
    try {
      const db = await getDatabase();
      if (!db || !db.businesses) {
        Alert.alert('Error', 'Database not ready. Please try again.');
        return;
      }
  
      const businessId = uuidv4();
      
      const newBusiness = await db.businesses.insert({
        id: businessId,
        name: newBusinessName.trim()
      });
  
      try {
        const serverResult = await ReplicationService.createBusiness({
          _id: businessId,
          name: newBusinessName.trim()
        });
  
        if (serverResult && serverResult.rev) {
          await newBusiness.update({
            $set: {
              _rev: serverResult.rev
            }
          });
        }
      } catch (error) {
        console.log('Server sync failed, will sync later');
      }
  
      setBusinesses(prev => [...prev, newBusiness]);
      setNewBusinessName('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding business:', error);
      Alert.alert('Error', 'Failed to add business. Please try again.');
    }
  };

  const handleDeleteBusiness = async (business: BusinessDocument) => {
    try {
      const db = await getDatabase();
      
      // Delete associated articles locally first
      const articles = await db.articles.find().where('business_id').eq(business.id).exec();
      for (const article of articles) {
        await article.update({
          $set: { _deleted: true }
        });
      }
  
      // Mark business for deletion locally
      const businessDoc = await db.businesses.findOne(business.id).exec();
      if (businessDoc) {
        await businessDoc.update({
          $set: { _deleted: true }
        });
      }
  
      // Try server delete if online
      try {
        await ReplicationService.deleteBusiness(business.id, business.get('_rev'));
        // If server delete successful, remove locally
        if (businessDoc) {
          await businessDoc.remove();
        }
        for (const article of articles) {
          await article.remove();
        }
      } catch (error) {
        console.log('Server delete failed, will sync later');
      }
  
      await loadBusinesses();
    } catch (error) {
      console.error('Error deleting business:', error);
      Alert.alert('Error', 'Failed to delete business');
    }
  };
  
  const handleUpdateBusiness = async () => {
    if (!editingBusiness || !newBusinessName.trim()) {
      Alert.alert('Error', 'Business name cannot be empty');
      return;
    }
    
    try {
      await editingBusiness.update({
        $set: { name: newBusinessName.trim() }
      });
  
      await ReplicationService.updateBusiness({
        _id: editingBusiness.id,
        name: newBusinessName.trim(),
        _rev: editingBusiness.get('_rev')
      });
  
      setNewBusinessName('');
      setEditingBusiness(null);
      setShowForm(false);
      loadBusinesses();
    } catch (error) {
      console.error('Error updating business:', error);
      Alert.alert('Error', 'Failed to update business');
    }
  };

  const handleBusinessPress = (business: BusinessDocument) => {
    navigation.navigate('ArticleList', { 
      businessId: business.id, 
      businessName: business.name 
    });
  };

  return (
    <View className={styles.container}>
      <Text className={styles.title}>Businesses</Text>
      
      {showForm && (
        <View className={styles.formContainer}>
          <TextInput
            className={styles.input}
            value={newBusinessName}
            onChangeText={setNewBusinessName}
            placeholder="Enter business name"
          />
          <TouchableOpacity
            className={styles.addButton}
            onPress={editingBusiness ? handleUpdateBusiness : handleAddBusiness}
          >
            <Text className={styles.addButtonText}>
              {editingBusiness ? 'Update' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={loading ? Array(5).fill({}) : businesses}
        keyExtractor={(item, index) => loading ? `skeleton-${index}` : item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
          className={styles.businessItem}
            onPress={() => handleBusinessPress(item)}
          >
            <View className={styles.businessContent}>
              <Text className={styles.businessName}>{item.name}</Text>
              <View className={styles.actionButtons}>
                <TouchableOpacity 
                  onPress={() => {
                    setEditingBusiness(item);
                    setNewBusinessName(item.name);
                    setShowForm(true);
                  }}
                  className={styles.iconButton}
                >
                  <Ionicons name="pencil" size={20} color="#3498db" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Alert.alert(
                      'Delete Business',
                      'Are you sure you want to delete this business?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', onPress: () => handleDeleteBusiness(item), style: 'destructive' }
                      ]
                    );
                  }}
                  className={styles.iconButton}
                >
                  <Ionicons name="trash" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() =>
          !loading && <Text className={styles.emptyText}>No businesses found. Add one above!</Text>
        }
      />

      <TouchableOpacity
        className={styles.floatingButton}
        onPress={() => setShowForm(!showForm)}
      >
        <Ionicons name={showForm ? "close" : "add"} size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  container: `flex-1 p-5 bg-white`,
  title: `text-[22px] font-semibold mb-5 text-center text-[#2c3e50]`,
  formContainer: `flex-row mb-4 items-center`,
  input: `flex-1 border border-[#ecf0f1] rounded-lg p-2.5 mr-2.5 text-sm text-[#2c3e50] bg-[#f9f9f9]`,
  addButton: `bg-[#3498db] rounded-lg py-2.5 px-4`,
  addButtonText: `text-white font-medium text-sm`,
  businessItem: `bg-white p-4 rounded-lg mb-2.5 border-l-4 border-l-[#3498db] border-b border-b-[#ecf0f1]`,
  businessName: `text-base font-medium text-[#2c3e50]`,
  emptyText: `text-center text-[#95a5a6] mt-5 text-sm italic`,
  floatingButton: `absolute right-5 bottom-5 bg-[#3498db] rounded-full w-14 h-14 justify-center items-center shadow-md`,
  skeletonItem: `bg-[#ecf0f1] p-4 rounded-lg mb-2.5`,
  skeletonText: `bg-[#dfe6e9] h-4 rounded mb-2`,
  businessContent: `flex-row justify-between items-center`,
  actionButtons: `flex-row gap-2.5`,
  iconButton: `p-1.5`,
};

export default BusinessListScreen;