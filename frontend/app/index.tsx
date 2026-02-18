import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from './contexts/AppContext';

export default function Index() {
  const { isOnboarded } = useApp();
  const router = useRouter();

  useEffect(() => {
    // Check onboarding status and navigate accordingly
    const timer = setTimeout(() => {
      if (isOnboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isOnboarded]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
