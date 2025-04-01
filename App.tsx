// App.tsx
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import './global.css';
import ReplicationService from './src/services/ReplicationService';

export default function App() {
  useEffect(() => {
    // Attempt manual sync on app startup
    setTimeout(() => {
      console.log('App initialized, attempting sync...');
      ReplicationService.startReplication();
    }, 3000); // Wait 3 seconds after app initialization
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}