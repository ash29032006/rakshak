import { Stack } from 'expo-router';
import { AppProvider } from './contexts/AppContext';
import React from 'react';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppProvider>
  );
}
