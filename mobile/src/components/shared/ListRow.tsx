/**
 * ListRow - Generic list item with leading icon, title/subtitle, optional trailing
 * Matches Figma `div.list-item` pattern.
 */
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { figmaColors, figmaFonts, figmaRadius } from '../../constants/theme';

interface ListRowProps {
  icon?: string; // emoji
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  trailing?: string; // text e.g. "→" or value
  trailingColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  icon,
  iconBgColor = figmaColors.pastelBlue,
  title,
  subtitle,
  trailing = '›',
  trailingColor = figmaColors.textMuted,
  onPress,
  style,
}: ListRowProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 8, tension: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={[styles.row, style]}>
        {icon ? (
          <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        ) : null}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? <Text style={[styles.trailing, { color: trailingColor }]}>{trailing}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: figmaRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: figmaFonts.sizes.lg,
    fontWeight: figmaFonts.weights.medium,
    color: figmaColors.textPrimary,
  },
  subtitle: {
    fontSize: figmaFonts.sizes.base,
    color: figmaColors.textSecondary,
  },
  trailing: {
    fontSize: 20,
    fontWeight: figmaFonts.weights.medium,
  },
});
