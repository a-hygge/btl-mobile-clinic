import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlassContainer } from 'expo-glass-effect';
import { theme } from '../src/constants/theme';
import { useAuthStore } from '../src/store/auth.store';

const USE_GLASS =
  Platform.OS === 'ios' &&
  typeof Platform.Version === 'string' &&
  parseInt(Platform.Version, 10) >= 26;

export default function RootLayout() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const content = (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </SafeAreaProvider>
  );

  if (USE_GLASS) {
    return (
      <GlassContainer style={{ flex: 1 }}>
        {content}
      </GlassContainer>
    );
  }

  return content;
}
