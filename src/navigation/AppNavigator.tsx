import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import BusinessListScreen from '../screens/BusinessListScreen';
import ArticleListScreen from '../screens/ArticleListScreen';
import { RootStackParamList } from '../types/navigation';
import NetworkStatus from '../components/NetworkStatus';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="BusinessList"
        screenOptions={{
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerRight: () => <NetworkStatus />,
          headerRightContainerStyle: styles.headerRightContainer,
        }}
      >
        <Stack.Screen 
          name="BusinessList" 
          component={BusinessListScreen} 
          options={{ title: 'My Businesses' }}
        />
        <Stack.Screen 
          name="ArticleList" 
          component={ArticleListScreen} 
          options={({ route }) => ({ title: route.params.businessName })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#007bff',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerRightContainer: {
    paddingRight: 10,
  },
  headerLeftIcon: {
    paddingLeft: 10,
  },
});

export default AppNavigator;