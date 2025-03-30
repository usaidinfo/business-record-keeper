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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{businessName} Articles</Text>
      
      {showForm && (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            value={newArticle.name}
            onChangeText={(text) => setNewArticle({ ...newArticle, name: text })}
            placeholder="Article name"
          />
          <TextInput
            style={styles.input}
            value={newArticle.qty}
            onChangeText={(text) => setNewArticle({ ...newArticle, qty: text })}
            placeholder="Quantity"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={newArticle.selling_price}
            onChangeText={(text) => setNewArticle({ ...newArticle, selling_price: text })}
            placeholder="Selling price"
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddArticle}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

<FlatList
  data={loading ? Array(5).fill({}) : articles}
  keyExtractor={(item, index) => loading ? `skeleton-${index}` : item.id}
  renderItem={({ item }) => (
    loading ? (
      <View style={styles.skeletonItem}>
        <View style={styles.skeletonText} />
        <View style={styles.skeletonShortText} />
      </View>
    ) : (
      <View style={styles.articleItem}>
        <Text style={styles.articleName}>{item.name}</Text>
        <Text style={styles.articleDetails}>Qty: {item.qty} | Price: ${item.selling_price}</Text>
      </View>
    )
  )}
  ListEmptyComponent={
    !loading && <Text style={styles.emptyText}>No articles found. Add one above!</Text>
  }
/>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowForm(!showForm)}
      >
        <Icon name={showForm ? "close" : "add"} size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  formContainer: {
    marginBottom: 16,
  },
  input: {
    borderColor: '#ecf0f1',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
    color: '#2c3e50',
    backgroundColor: '#f9f9f9',
  },
  addButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  articleItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  articleName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  articleDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#95a5a6',
    marginTop: 20,
    fontSize: 14,
    fontStyle: 'italic',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#3498db',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  skeletonItem: {
    backgroundColor: '#ecf0f1',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  skeletonText: {
    backgroundColor: '#dfe6e9',
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonShortText: {
    backgroundColor: '#dfe6e9',
    height: 14,
    borderRadius: 4,
    width: '60%',
  },
});

export default ArticleListScreen;