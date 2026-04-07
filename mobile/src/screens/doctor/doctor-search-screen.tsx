import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  EmptyState,
  FadeInView,
  GradientHeader,
} from '../../components/shared';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { systemColors, theme } from '../../constants/theme';
import { getDoctors } from '../../services/doctors.service';
import { getSpecialties } from '../../services/specialties.service';
import type { Doctor, Specialty } from '../../types';

type SortKey = 'rating' | 'fee' | 'experience';

interface FilterState {
  specialtyId: string | null;
  minRating: number; // 0 = any
  sort: SortKey;
}

const SORT_LABELS: Record<SortKey, string> = {
  rating: 'Top rated',
  fee: 'Lowest fee',
  experience: 'Most experience',
};

const SORT_ICONS: Record<SortKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  rating: 'star',
  fee: 'cash',
  experience: 'briefcase',
};

const DEFAULT_FILTERS: FilterState = {
  specialtyId: null,
  minRating: 0,
  sort: 'rating',
};

export function DoctorSearchScreen() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter sheet animation
  const sheetAnim = useRef(new Animated.Value(0)).current;

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Load specialties once
  useEffect(() => {
    void (async () => {
      try {
        const list = await getSpecialties();
        setSpecialties(list);
      } catch {
        // ignore
      }
    })();
  }, []);

  const loadDoctors = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const result = await getDoctors({
          q: debounced.trim() || undefined,
          specialtyId: filters.specialtyId ?? undefined,
          limit: 30,
        });
        setDoctors(result.data);
      } catch {
        setDoctors([]);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [debounced, filters.specialtyId]
  );

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  // Animate filter sheet
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: showFilters ? 1 : 0,
      friction: 9,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [showFilters, sheetAnim]);

  // Apply client-side rating filter + sort
  const visibleDoctors = useMemo(() => {
    let list = doctors.slice();
    if (filters.minRating > 0) {
      list = list.filter((d) => (d.averageRating ?? 0) >= filters.minRating);
    }
    list.sort((a, b) => {
      if (filters.sort === 'rating') {
        return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      }
      if (filters.sort === 'fee') {
        return (a.consultationFee ?? 0) - (b.consultationFee ?? 0);
      }
      return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
    });
    return list;
  }, [doctors, filters.minRating, filters.sort]);

  const activeFilterCount =
    (filters.specialtyId ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.sort !== 'rating' ? 1 : 0);

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });
  const sheetScale = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <ScreenBackground>
      <GradientHeader
        title="Find a doctor"
        subtitle="Search by name, specialty, or rating"
        leftSlot={
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </Pressable>
        }
      >
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={systemColors.gray}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search doctors"
              placeholderTextColor={systemColors.gray2}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={systemColors.gray2}
                />
              </Pressable>
            )}
          </View>
        </View>
      </GradientHeader>

      {/* Filter chips row */}
      <View style={styles.chipsRow}>
        <FilterChip
          label={
            filters.specialtyId
              ? specialties.find((s) => s.id === filters.specialtyId)?.name ??
                'Specialty'
              : 'Specialty'
          }
          icon="medical-bag"
          active={!!filters.specialtyId}
          onPress={() => setShowFilters((v) => !v)}
        />
        <FilterChip
          label={filters.minRating > 0 ? `${filters.minRating}+ rating` : 'Rating'}
          icon="star"
          active={filters.minRating > 0}
          onPress={() => setShowFilters((v) => !v)}
        />
        <FilterChip
          label={SORT_LABELS[filters.sort]}
          icon={SORT_ICONS[filters.sort]}
          active={filters.sort !== 'rating'}
          onPress={() => setShowFilters((v) => !v)}
        />
        {activeFilterCount > 0 && (
          <Pressable
            onPress={() => setFilters(DEFAULT_FILTERS)}
            style={styles.clearChip}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="close"
              size={14}
              color={theme.colors.primary}
            />
            <Text style={styles.clearChipText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Animated filter sheet */}
      {showFilters && (
        <Animated.View
          style={[
            styles.sheetWrap,
            {
              transform: [
                { translateY: sheetTranslate },
                { scale: sheetScale },
              ],
            },
          ]}
        >
          <GlassCard style={styles.sheetCard}>
            <Text style={styles.sheetSectionTitle}>Specialty</Text>
            <View style={styles.sheetWrapRow}>
              <SheetChip
                label="All"
                active={filters.specialtyId === null}
                onPress={() =>
                  setFilters((f) => ({ ...f, specialtyId: null }))
                }
              />
              {specialties.map((s) => (
                <SheetChip
                  key={s.id}
                  label={s.name}
                  active={filters.specialtyId === s.id}
                  onPress={() =>
                    setFilters((f) => ({ ...f, specialtyId: s.id }))
                  }
                />
              ))}
            </View>

            <Text style={styles.sheetSectionTitle}>Minimum rating</Text>
            <View style={styles.sheetWrapRow}>
              {[0, 3, 4, 4.5].map((r) => (
                <SheetChip
                  key={r}
                  label={r === 0 ? 'Any' : `${r}+`}
                  active={filters.minRating === r}
                  onPress={() => setFilters((f) => ({ ...f, minRating: r }))}
                  icon={r > 0 ? 'star' : undefined}
                />
              ))}
            </View>

            <Text style={styles.sheetSectionTitle}>Sort by</Text>
            <View style={styles.sheetWrapRow}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <SheetChip
                  key={key}
                  label={SORT_LABELS[key]}
                  active={filters.sort === key}
                  onPress={() => setFilters((f) => ({ ...f, sort: key }))}
                  icon={SORT_ICONS[key]}
                />
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.applyBtn,
                pressed && styles.applyBtnPressed,
              ]}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyBtnText}>Done</Text>
            </Pressable>
          </GlassCard>
        </Animated.View>
      )}

      <FlatList
        data={visibleDoctors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDoctors({ refresh: true })}
          />
        }
        renderItem={({ item, index }) => (
          <DoctorRow doctor={item} index={index} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="doctor"
                title="No doctors found"
                message="Try adjusting your search or filters"
              />
            </View>
          )
        }
      />
    </ScreenBackground>
  );
}

/* ----------------- Sub-components ----------------- */

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, {
          toValue: 0.94,
          useNativeDriver: true,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start()
      }
    >
      <Animated.View
        style={[
          styles.chip,
          active && styles.chipActive,
          { transform: [{ scale }] },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={14}
          color={active ? '#fff' : theme.colors.primary}
        />
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function SheetChip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sheetChip, active && styles.sheetChipActive]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={13}
          color={active ? '#fff' : theme.colors.primary}
        />
      ) : null}
      <Text
        style={[
          styles.sheetChipText,
          active && styles.sheetChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DoctorRow({ doctor, index }: { doctor: Doctor; index: number }) {
  const translateY = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 50,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 50,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, translateY, scale]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }, { scale }],
      }}
    >
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/doctors/[id]',
            params: { id: doctor.id },
          })
        }
        onPressIn={() =>
          Animated.spring(pressScale, {
            toValue: 0.97,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(pressScale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }).start()
        }
      >
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <GlassCard style={styles.doctorCard}>
            <View style={styles.doctorRow}>
              <View style={styles.doctorAvatar}>
                <MaterialCommunityIcons
                  name="doctor"
                  size={26}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName} numberOfLines={1}>
                  {doctor.name}
                </Text>
                <Text style={styles.doctorMeta} numberOfLines={1}>
                  {doctor.specialty?.name}
                  {doctor.clinic ? ` \u2022 ${doctor.clinic.name}` : ''}
                </Text>
                <View style={styles.doctorStats}>
                  <MaterialCommunityIcons
                    name="star"
                    size={13}
                    color={systemColors.orange}
                  />
                  <Text style={styles.ratingText}>
                    {(doctor.averageRating ?? 0).toFixed(1)}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({doctor.totalReviews ?? 0})
                  </Text>
                  <View style={styles.dot} />
                  <Text style={styles.expText}>
                    {doctor.experienceYears}y exp
                  </Text>
                </View>
              </View>
              <View style={styles.doctorRight}>
                <Text style={styles.feeText}>
                  {doctor.consultationFee.toLocaleString()}d
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={systemColors.gray3}
                />
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/* ----------------- Styles ----------------- */

const styles = StyleSheet.create({
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: {
    marginTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.onSurface,
    paddingVertical: 0,
  },

  /* Chips */
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryContainer,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  chipTextActive: {
    color: '#fff',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  /* Sheet */
  sheetWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetCard: {
    padding: 16,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: systemColors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  sheetWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: systemColors.gray6,
  },
  sheetChipActive: {
    backgroundColor: theme.colors.primary,
  },
  sheetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sheetChipTextActive: {
    color: '#fff',
  },
  applyBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* List */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 12,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingTop: 32,
  },

  /* Doctor card */
  doctorCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorInfo: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  doctorMeta: {
    fontSize: 13,
    color: systemColors.gray,
  },
  doctorStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: systemColors.orange,
  },
  reviewCount: {
    fontSize: 11,
    color: systemColors.gray,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: systemColors.gray3,
    marginHorizontal: 2,
  },
  expText: {
    fontSize: 12,
    color: systemColors.gray,
  },
  doctorRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  feeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
