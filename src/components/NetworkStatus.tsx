// src/components/NetworkStatus.tsx
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import NetworkService from '../services/NetworkService';
import ReplicationService from '../services/ReplicationService';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Idle');
  
  useEffect(() => {
    const unsubscribe = NetworkService.addListener((status) => {
      setIsOnline(status);
      setSyncStatus(status ? 'Syncing' : 'Offline');
    });
    
    return unsubscribe;
  }, []);
  
  if (isOnline) {
    return (
      <View className="bg-green-500 px-2 py-1 rounded-md">
        <Text className="text-white text-xs">Online (Syncing)</Text>
      </View>
    );
  }
  
  return (
    <View className="bg-red-500 px-2 py-1 rounded-md">
      <Text className="text-white text-xs">Offline</Text>
    </View>
  );
};

export default NetworkStatus;