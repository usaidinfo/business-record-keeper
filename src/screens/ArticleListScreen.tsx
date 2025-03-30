import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { getDatabase } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { ArticleListScreenProps } from '../types/navigation';
import { Article } from '../database/models/articleSchema';
import { RxDocument } from 'rxdb';
import Icon from 'react-native-vector-icons/Ionicons';

type ArticleDocument = RxDocument<Article>;

const ArticleListScreen: React.FC<ArticleListScreenProps> = ({ route }) => {
  const { businessId, businessName } = route.params;
  const [articles, setArticles] = useState<ArticleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [newArticle, setNewArticle] = useState({ name: '', qty: '', selling_price: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleDocument | null>(null);


  useEffect(() => {
    loadArticles();
  }, [businessId]);

  const loadArticles = async () => {
    try {
      const db = await getDatabase();
      const results = await db.articles.find({
        selector: {
          business_id: businessId
        }
      }).exec();
      setArticles(results);
      setLoading(false);
    } catch (error) {
      console.error('Error loading articles:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load articles');
    }
  };

  const handleAddArticle = async () => {
    if (!newArticle.name.trim() || !newArticle.qty || !newArticle.selling_price) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    
    try {
      const db = await getDatabase();
      await db.articles.insert({
        id: uuidv4(),
        name: newArticle.name.trim(),
        qty: parseInt(newArticle.qty, 10),
        selling_price: parseFloat(newArticle.selling_price),
        business_id: businessId
      });
      setNewArticle({ name: '', qty: '', selling_price: '' });
      setShowForm(false);
      loadArticles();
    } catch (error) {
      console.error('Error adding article:', error);
      Alert.alert('Error', 'Failed to add article');
    }
  };

  const handleDeleteArticle = async (article: ArticleDocument) => {
    try {
      await article.remove();
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      Alert.alert('Error', 'Failed to delete article');
    }
  };
  
  const handleUpdateArticle = async () => {
    if (!editingArticle || !newArticle.name.trim() || !newArticle.qty || !newArticle.selling_price) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    
    try {
      await editingArticle.update({
        $set: {
          name: newArticle.name.trim(),
          qty: parseInt(newArticle.qty, 10),
          selling_price: parseFloat(newArticle.selling_price)
        }
      });
      setNewArticle({ name: '', qty: '', selling_price: '' });
      setEditingArticle(null);
      setShowForm(false);
      loadArticles();
    } catch (error) {
      console.error('Error updating article:', error);
      Alert.alert('Error', 'Failed to update article');
    }
  };

  return (
    <View className={styles.container}>
      <Text className={styles.title}>{businessName} Articles</Text>
      
      {showForm && (
        <View className={styles.formContainer}>
          <TextInput
            className={styles.input}
            value={newArticle.name}
            onChangeText={(text) => setNewArticle({ ...newArticle, name: text })}
            placeholder="Article name"
          />
          <TextInput
            className={styles.input}
            value={newArticle.qty}
            onChangeText={(text) => setNewArticle({ ...newArticle, qty: text })}
            placeholder="Quantity"
            keyboardType="numeric"
          />
          <TextInput
            className={styles.input}
            value={newArticle.selling_price}
            onChangeText={(text) => setNewArticle({ ...newArticle, selling_price: text })}
            placeholder="Selling price"
            keyboardType="numeric"
          />
          <TouchableOpacity
            className={styles.addButton}
            onPress={handleAddArticle}
          >
            <Text className={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={loading ? Array(5).fill({}) : articles}
        keyExtractor={(item, index) => loading ? `skeleton-${index}` : item.id}
        renderItem={({ item }) => (
          loading ? (
            <View className={styles.skeletonItem}>
              <View className={styles.skeletonText} />
              <View className={styles.skeletonShortText} />
            </View>
          ) : (
            <View className={styles.articleItem}>
              <View className={styles.articleContent}>
                <View>
                  <Text className={styles.articleName}>{item.name}</Text>
                  <Text className={styles.articleDetails}>
                    Qty: {item.qty} | Price: ${item.selling_price}
                  </Text>
                </View>
                <View className={styles.actionButtons}>
                  <TouchableOpacity 
                    onPress={() => {
                      setEditingArticle(item);
                      setNewArticle({
                        name: item.name,
                        qty: item.qty.toString(),
                        selling_price: item.selling_price.toString()
                      });
                      setShowForm(true);
                    }}
                    className={styles.iconButton}
                  >
                    <Icon name="pencil" size={20} color="#3498db" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      Alert.alert(
                        'Delete Article',
                        'Are you sure you want to delete this article?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', onPress: () => handleDeleteArticle(item), style: 'destructive' }
                        ]
                      );
                    }}
                    className={styles.iconButton}
                  >
                    <Icon name="trash" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        )}
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>No articles found. Add one above!</Text>
        }
      />

      <TouchableOpacity
        className={styles.floatingButton}
        onPress={() => setShowForm(!showForm)}
      >
        <Icon name={showForm ? "close" : "add"} size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  container: `flex-1 p-5 bg-white`,
  title: `text-[22px] font-semibold mb-5 text-center text-[#2c3e50]`,
  formContainer: `mb-4`,
  input: `border border-[#ecf0f1] rounded-lg p-2.5 mb-2 text-sm text-[#2c3e50] bg-[#f9f9f9]`,
  addButton: `bg-[#3498db] rounded-lg py-2.5 px-4 items-center`,
  addButtonText: `text-white font-medium text-sm`,
  articleItem: `bg-white p-4 rounded-lg mb-2.5 border-l-4 border-l-[#3498db] border-b border-b-[#ecf0f1]`,
  articleName: `text-base font-medium text-[#2c3e50]`,
  articleDetails: `text-sm text-[#7f8c8d] mt-1`,
  emptyText: `text-center text-[#95a5a6] mt-5 text-sm italic`,
  floatingButton: `absolute right-5 bottom-5 bg-[#3498db] rounded-full w-14 h-14 justify-center items-center shadow-md`,
  skeletonItem: `bg-[#ecf0f1] p-4 rounded-lg mb-2.5`,
  skeletonText: `bg-[#dfe6e9] h-4 rounded mb-2`,
  skeletonShortText: `bg-[#dfe6e9] h-3.5 rounded w-3/5`,
  articleContent: `flex-row justify-between items-center`,
  actionButtons: `flex-row gap-2.5`,
  iconButton: `p-1.5`,
};

export default ArticleListScreen;