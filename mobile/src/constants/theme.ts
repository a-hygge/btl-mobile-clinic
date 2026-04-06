import { MD3LightTheme } from 'react-native-paper';

// iOS 26 Liquid Glass palette — softer tones that let glass translucency shine
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF',           // iOS system blue
    primaryContainer: '#D6EAFF',
    secondary: '#34C759',         // iOS system green
    secondaryContainer: '#D4F5DD',
    tertiary: '#5856D6',          // iOS system indigo
    error: '#FF3B30',             // iOS system red
    errorContainer: '#FFD6D4',
    background: '#F2F2F7',        // iOS system grouped background
    surface: '#FFFFFF',
    surfaceVariant: '#F2F2F7',
    outline: '#C6C6C8',           // iOS separator
    onSurface: '#1C1C1E',         // iOS label
    onSurfaceVariant: '#636366',  // iOS secondary label
    onBackground: '#1C1C1E',
  },
  roundness: 14,
};

// iOS system colors for quick access
export const systemColors = {
  blue: '#007AFF',
  green: '#34C759',
  indigo: '#5856D6',
  orange: '#FF9500',
  pink: '#FF2D55',
  purple: '#AF52DE',
  red: '#FF3B30',
  teal: '#5AC8FA',
  yellow: '#FFCC00',
  gray: '#8E8E93',
  gray2: '#AEAEB2',
  gray3: '#C7C7CC',
  gray4: '#D1D1D6',
  gray5: '#E5E5EA',
  gray6: '#F2F2F7',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
