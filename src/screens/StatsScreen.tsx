import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function StatsScreen() {
  return <View style={s.c}><Text>统计</Text></View>;
}
const s = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
