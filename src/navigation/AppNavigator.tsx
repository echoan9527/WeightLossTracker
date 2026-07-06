import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TodayScreen from '../screens/TodayScreen';
import StatsScreen from '../screens/StatsScreen';
import GoalScreen from '../screens/GoalScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#2e86de' }}>
      <Tab.Screen name="今日" component={TodayScreen} />
      <Tab.Screen name="统计" component={StatsScreen} />
      <Tab.Screen name="目标" component={GoalScreen} />
    </Tab.Navigator>
  );
}
