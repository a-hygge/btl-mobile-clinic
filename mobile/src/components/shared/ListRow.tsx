/**
 * ListRow - Generic list item with leading icon, title/subtitle, optional trailing
 * Matches Figma `div.list-item` pattern.
 */
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        style,
        pressed && styles.pressed,
      ]}
    >
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
  pressed: {
    opacity: 0.6,
    backgroundColor: 'rgba(0,0,0,0.03)',
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
