import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GlassCard } from '../ui/GlassCard';
import { theme, systemColors } from '../../constants/theme';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  badge?: number | string;
}

interface TabSwitcherProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function TabSwitcher<T extends string>({ tabs, value, onChange }: TabSwitcherProps<T>) {
  return (
    <GlassCard style={styles.outer}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => onChange(tab.value)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
              {tab.badge !== undefined && tab.badge !== 0 && (
                <View style={[styles.badge, active && styles.badgeActive]}>
                  <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                    {tab.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    padding: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: systemColors.gray,
  },
  labelActive: {
    color: '#fff',
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: systemColors.gray3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  badgeTextActive: {
    color: '#fff',
  },
});
