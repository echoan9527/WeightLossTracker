import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TodayScreen from "../screens/TodayScreen";
import StatsScreen from "../screens/StatsScreen";
import GoalScreen from "../screens/GoalScreen";
import { colors, radius, spacing } from "../styles/theme";

const Tab = createBottomTabNavigator();
const TAB_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  今日: { label: "今日", icon: "today-outline" },
  统计: { label: "统计", icon: "stats-chart-outline" },
  目标: { label: "目标", icon: "flag-outline" },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const meta = TAB_META[name];

  return (
    <View style={[s.iconWrap, focused && s.iconWrapA]}>
      <Ionicons
        name={meta.icon}
        size={20}
        color={focused ? "#fff" : "#667085"}
      />
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2e86de",
        tabBarInactiveTintColor: "#667085",
        tabBarLabel: TAB_META[route.name].label,
        tabBarLabelStyle: s.label,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarStyle: s.tabBar,
        tabBarItemStyle: s.tabItem,
      })}
    >
      <Tab.Screen name="今日" component={TodayScreen} />
      <Tab.Screen name="统计" component={StatsScreen} />
      <Tab.Screen name="目标" component={GoalScreen} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  tabBar: {
    height: 82,
    paddingTop: 8,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  tabItem: {
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 4,
    paddingBottom: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  iconWrapA: {
    backgroundColor: "#2e86de",
  },
});
