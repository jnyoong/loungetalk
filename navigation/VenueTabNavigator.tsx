import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import VenueDashboardScreen from '../screens/venue/VenueDashboardScreen';
import VenueProfileEditScreen from '../screens/venue/VenueProfileEditScreen';
import EventManageScreen from '../screens/venue/EventManageScreen';
import VenueSettingsScreen from '../screens/venue/VenueSettingsScreen';
import type { VenueTabParamList } from '../types';

const Tab = createBottomTabNavigator<VenueTabParamList>();

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
        size={22}
        color={focused ? Colors.accent : Colors.textMuted}
      />
      <Text
        style={[styles.tabLabel, { color: focused ? Colors.accent : Colors.textMuted }]}
        allowFontScaling={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {label}
      </Text>
    </View>
  );
}

export default function VenueTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={VenueDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="bar-chart-outline"
              nameActive="bar-chart"
              label="대시보드"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MyVenue"
        component={VenueProfileEditScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="storefront-outline"
              nameActive="storefront"
              label="업장정보"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="EventManage"
        component={EventManageScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="calendar-outline"
              nameActive="calendar"
              label="이벤트"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="VenueProfile"
        component={VenueSettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="settings-outline"
              nameActive="settings"
              label="설정"
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
    gap: 3,
    paddingTop: 8,
    width: '100%',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0,
    textAlign: 'center',
    width: '100%',
  },
});
