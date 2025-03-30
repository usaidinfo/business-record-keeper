// src/services/NetworkService.ts
import NetInfo from '@react-native-community/netinfo';

type NetworkListener = (isConnected: boolean) => void;

class NetworkService {
  listeners: NetworkListener[] = [];
  isConnected = false;

  constructor() {
    NetInfo.fetch().then(state => {
      this.isConnected = !!state.isConnected;
      this.notifyListeners();
    });

    NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = !!state.isConnected;
      
      if (wasConnected !== this.isConnected) {
        console.log(`Network status changed: ${this.isConnected ? 'Online' : 'Offline'}`);
        this.notifyListeners();
      }
    });
  }

  addListener(callback: NetworkListener) {
    this.listeners.push(callback);
    callback(this.isConnected);
    
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.isConnected));
  }

  isOnline() {
    return this.isConnected;
  }
}

export default new NetworkService();