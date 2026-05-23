import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';
import AuthNavigator from './AuthNavigator';
import ConsumerTabNavigator from './ConsumerTabNavigator';
import VenueTabNavigator from './VenueTabNavigator';
import VenueDetailScreen from '../screens/consumer/VenueDetailScreen';
import EventDetailScreen from '../screens/consumer/EventDetailScreen';
import ReservationScreen from '../screens/consumer/ReservationScreen';
import MyReservationsScreen from '../screens/consumer/MyReservationsScreen';
import VenueReservationsScreen from '../screens/venue/VenueReservationsScreen';
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : profile?.role === 'venue_owner' ? (
          <>
            <Stack.Screen name="Main" component={VenueTabNavigator} />
            <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="VenueReservations" component={VenueReservationsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={ConsumerTabNavigator} />
            <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="Reservation" component={ReservationScreen} />
            <Stack.Screen name="MyReservations" component={MyReservationsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
