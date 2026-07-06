import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { initDB } from './src/db/database';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => { initDB().then(() => setReady(true)); }, []);
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  return <NavigationContainer><AppNavigator /></NavigationContainer>;
}
