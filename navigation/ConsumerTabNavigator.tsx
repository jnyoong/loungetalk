import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import HomeScreen from '../screens/consumer/HomeScreen';
import EventsScreen from '../screens/consumer/EventsScreen';
import FavoritesScreen from '../screens/consumer/FavoritesScreen';
import ProfileScreen from '../screens/consumer/ProfileScreen';
import type { ConsumerTabParamList } from '../types';

const Tab = createBottomTabNavigator<ConsumerTabParamList>();

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  nameActive: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}

function TabIcon({ name, nameActive, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? nameActive : name}
        size={24}
        color={focused ? Colors.accent : Colors.textMuted}
      />
      <Text
        style={[styles.tabLabel, { color: focused ? Colors.accent : Colors.textMuted }]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

export default function ConsumerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="compass-outline"
              nameActive="compass"
              label="탐색"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="flash-outline"
              nameActive="flash"
              label="이벤트"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="bookmark-outline"
              nameActive="bookmark"
              label="저장"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="person-outline"
              nameActive="person"
              label="MY"
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    height: Platform.OS === 'ios' ? 86 : 64,
    paddingBottom: Platform.OS === 'ios' ? 26 : 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
