import { Platform, StyleSheet } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/store/auth.store';
import { LoadingScreen } from '../../src/components/loading-screen';

const TAB_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  home: 'home',
  booking: 'calendar-plus',
  appointments: 'clipboard-list',
  profile: 'account-circle',
};

const IS_IOS_26 = (() => {
  if (Platform.OS !== 'ios') return false;
  const v = typeof Platform.Version === 'string'
    ? parseInt(Platform.Version, 10)
    : Platform.Version;
  return v >= 26;
})();

function GlassTabBarBackground() {
  if (IS_IOS_26) {
    return (
      <GlassView
        style={StyleSheet.absoluteFill}
        glassEffectStyle="regular"
        isInteractive
      />
    );
  }
  return (
    <BlurView
      style={StyleSheet.absoluteFill}
      intensity={80}
      tint="light"
    />
  );
}

export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const iconName = TAB_ICON[route.name] ?? 'circle';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="booking" options={{ title: 'Book' }} />
      <Tabs.Screen name="appointments" options={{ title: 'Appointments' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="doctors/[id]" options={{ href: null }} />
    </Tabs>
  );
}
