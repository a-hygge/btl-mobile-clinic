import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>Loading BTL Healthcare</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  text: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
});
