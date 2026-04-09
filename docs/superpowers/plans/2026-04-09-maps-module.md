# Maps Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `maps/` backend module (Nominatim geocoding + Haversine distance) and an interactive `MapView` in the mobile booking flow's clinic selection step.

**Architecture:** New backend module `backend/src/modules/maps/` with 3 endpoints (nearby clinics, geocode, reverse-geocode). New mobile component `ClinicMapView` using `react-native-maps`. New hook `useUserLocation` wrapping `expo-location`. The booking screen imports the map component below the clinic list.

**Tech Stack:** Express.js, Zod, Prisma (read-only), axios (Nominatim), react-native-maps, expo-location

---

## File Structure

### Backend (new files)
- `backend/src/modules/maps/maps.utils.ts` — Haversine distance formula
- `backend/src/modules/maps/maps.dto.ts` — Zod schemas + TypeScript types
- `backend/src/modules/maps/maps.service.ts` — Business logic (DB queries + Nominatim calls)
- `backend/src/modules/maps/maps.controller.ts` — HTTP handlers
- `backend/src/modules/maps/maps.routes.ts` — Route definitions
- `backend/src/modules/maps/index.ts` — Barrel exports

### Backend (modify)
- `backend/src/app.ts:17` — Add import + route registration for maps module

### Mobile (new files)
- `mobile/src/services/maps.service.ts` — API client for maps endpoints
- `mobile/src/hooks/use-user-location.ts` — expo-location wrapper hook
- `mobile/src/components/maps/ClinicMapView.tsx` — MapView with clinic markers

### Mobile (modify)
- `mobile/src/screens/booking/booking-screen.tsx:722-745` — Add ClinicMapView below clinic list

---

## Task 1: Haversine Utility

**Files:**
- Create: `backend/src/modules/maps/maps.utils.ts`

- [ ] **Step 1: Create Haversine utility**

```typescript
// backend/src/modules/maps/maps.utils.ts

/**
 * Calculate distance between two coordinates using the Haversine formula.
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // round to 2 decimal places
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit src/modules/maps/maps.utils.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/maps/maps.utils.ts
git -c user.name="a-hygge" -c user.email="nguyenthituanh135@gmail.com" commit -m "feat(maps): add Haversine distance utility"
```

---

## Task 2: Maps DTOs (Zod schemas + types)

**Files:**
- Create: `backend/src/modules/maps/maps.dto.ts`

- [ ] **Step 1: Create DTO file with Zod schemas and result types**

```typescript
// backend/src/modules/maps/maps.dto.ts
import { z } from 'zod';

// --- Query Schemas ---

export const nearbyClinicsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(100).default(20),
  specialtyId: z.string().uuid().optional(),
});

export type NearbyClinicsQuery = z.infer<typeof nearbyClinicsQuerySchema>;

export const geocodeQuerySchema = z.object({
  address: z.string().trim().min(1),
});

export type GeocodeQuery = z.infer<typeof geocodeQuerySchema>;

export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type ReverseGeocodeQuery = z.infer<typeof reverseGeocodeQuerySchema>;

// --- Response Types ---

export interface NearbyClinicDto {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  distance: number; // km
}

export interface GeocodeResultDto {
  lat: number;
  lng: number;
  displayName: string;
}

export interface ReverseGeocodeResultDto {
  address: string;
  displayName: string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit src/modules/maps/maps.dto.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/maps/maps.dto.ts
git -c user.name="a-hygge" -c user.email="nguyenthituanh135@gmail.com" commit -m "feat(maps): add Zod schemas and DTO types"
```

---

## Task 3: Maps Service

**Files:**
- Create: `backend/src/modules/maps/maps.service.ts`

- [ ] **Step 1: Create maps service with all 3 functions**

```typescript
// backend/src/modules/maps/maps.service.ts
import axios from 'axios';
import { prisma } from '@config/database';
import { AppError } from '@utils/app-error';
import { haversineDistance } from './maps.utils';
import type {
  NearbyClinicsQuery,
  NearbyClinicDto,
  GeocodeQuery,
  GeocodeResultDto,
  ReverseGeocodeQuery,
  ReverseGeocodeResultDto,
} from './maps.dto';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'healthcare-booking-app/1.0';

export async function getNearbyClinics(query: NearbyClinicsQuery): Promise<NearbyClinicDto[]> {
  const { lat, lng, radius, specialtyId } = query;

  const clinics = await prisma.clinic.findMany({
    where: {
      deletedAt: null,
      lat: { not: null },
      lng: { not: null },
      ...(specialtyId
        ? {
            doctors: {
              some: {
                specialtyId,
                deletedAt: null,
                status: 'ACTIVE',
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      address: true,
      lat: true,
      lng: true,
      phone: true,
      imageUrl: true,
      openingHours: true,
    },
  });

  const results: NearbyClinicDto[] = [];

  for (const clinic of clinics) {
    const clinicLat = Number(clinic.lat);
    const clinicLng = Number(clinic.lng);
    const distance = haversineDistance(lat, lng, clinicLat, clinicLng);

    if (distance <= radius) {
      results.push({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        lat: clinicLat,
        lng: clinicLng,
        phone: clinic.phone,
        imageUrl: clinic.imageUrl,
        openingHours: clinic.openingHours,
        distance,
      });
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results;
}

export async function geocodeAddress(query: GeocodeQuery): Promise<GeocodeResultDto> {
  try {
    const response = await axios.get(`${NOMINATIM_BASE}/search`, {
      params: {
        q: query.address,
        format: 'json',
        limit: 1,
      },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000,
    });

    const results = response.data;
    if (!Array.isArray(results) || results.length === 0) {
      throw AppError.notFound('Address not found');
    }

    const first = results[0];
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, 'GEOCODING_UNAVAILABLE', 'Geocoding service unavailable');
  }
}

export async function reverseGeocode(query: ReverseGeocodeQuery): Promise<ReverseGeocodeResultDto> {
  try {
    const response = await axios.get(`${NOMINATIM_BASE}/reverse`, {
      params: {
        lat: query.lat,
        lon: query.lng,
        format: 'json',
      },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000,
    });

    const data = response.data;
    if (data.error) {
      throw AppError.notFound('Location not found');
    }

    return {
      address: data.address
        ? [data.address.road, data.address.suburb, data.address.city, data.address.country]
            .filter(Boolean)
            .join(', ')
        : data.display_name,
      displayName: data.display_name,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, 'GEOCODING_UNAVAILABLE', 'Geocoding service unavailable');
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit src/modules/maps/maps.service.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/maps/maps.service.ts
git -c user.name="a-hygge" -c user.email="nguyenthituanh135@gmail.com" commit -m "feat(maps): add maps service with nearby, geocode, reverse-geocode"
```

---

## Task 4: Maps Controller

**Files:**
- Create: `backend/src/modules/maps/maps.controller.ts`

- [ ] **Step 1: Create controller with 3 handlers**

```typescript
// backend/src/modules/maps/maps.controller.ts
import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@utils/api-response';
import {
  nearbyClinicsQuerySchema,
  geocodeQuerySchema,
  reverseGeocodeQuerySchema,
} from './maps.dto';
import {
  getNearbyClinics,
  geocodeAddress,
  reverseGeocode,
} from './maps.service';

export async function nearbyClinics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = nearbyClinicsQuerySchema.parse(req.query);
    const results = await getNearbyClinics(query);
    sendSuccess(res, results);
  } catch (error) {
    next(error);
  }
}

export async function geocode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = geocodeQuerySchema.parse(req.query);
    const result = await geocodeAddress(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function reverseGeocodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = reverseGeocodeQuerySchema.parse(req.query);
    const result = await reverseGeocode(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit src/modules/maps/maps.controller.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/maps/maps.controller.ts
git -c user.name="a-hygge" -c user.email="nguyenthituanh135@gmail.com" commit -m "feat(maps): add maps controller"
```

---

## Task 5: Maps Routes + Index + Register in app.ts

**Files:**
- Create: `backend/src/modules/maps/maps.routes.ts`
- Create: `backend/src/modules/maps/index.ts`
- Modify: `backend/src/app.ts:17` (add import + route)

- [ ] **Step 1: Create routes file**

```typescript
// backend/src/modules/maps/maps.routes.ts
import { Router } from 'express';
import { nearbyClinics, geocode, reverseGeocodeHandler } from './maps.controller';

export const mapsRouter = Router();

mapsRouter.get('/clinics/nearby', nearbyClinics);
mapsRouter.get('/geocode', geocode);
mapsRouter.get('/reverse-geocode', reverseGeocodeHandler);
```

- [ ] **Step 2: Create index barrel export**

```typescript
// backend/src/modules/maps/index.ts
export { mapsRouter } from './maps.routes';
export { getNearbyClinics, geocodeAddress, reverseGeocode } from './maps.service';
export { haversineDistance } from './maps.utils';
```

- [ ] **Step 3: Register routes in app.ts**

In `backend/src/app.ts`, add after line 19 (notification import):

```typescript
import { mapsRouter } from './modules/maps/maps.routes';
```

Add after line 50 (notification route, before error handler):

```typescript
app.use('/api/v1/maps', mapsRouter);
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Start backend and test endpoints**

Run: `cd backend && npm run dev &`

Then test:
```bash
# Test nearby clinics (Ha Noi coordinates)
curl -s "http://localhost:3000/api/v1/maps/clinics/nearby?lat=21.0285&lng=105.8542&radius=50" | head -c 500

# Test geocode
curl -s "http://localhost:3000/api/v1/maps/geocode?address=Ha+Noi+Viet+Nam" | head -c 300

# Test reverse geocode
curl -s "http://localhost:3000/api/v1/maps/reverse-geocode?lat=21.0285&lng=105.8542" | head -c 300
```

Expected: JSON responses with `{ success: true, data: ... }`

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/maps/maps.routes.ts backend/src/modules/maps/index.ts backend/src/app.ts
git -c user.name="a-hygge" -c user.email="nguyenthituanh135@gmail.com" commit -m "feat(maps): add routes, register module in app"
```

---

## Task 6: Mobile Maps Service

**Files:**
- Create: `mobile/src/services/maps.service.ts`

- [ ] **Step 1: Create maps API service**

```typescript
// mobile/src/services/maps.service.ts
import { api, extractData } from './api';

export interface NearbyClinic {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  distance: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function getNearbyClinics(params: {
  lat: number;
  lng: number;
  radius?: number;
  specialtyId?: string;
}): Promise<NearbyClinic[]> {
  const response = await api.get('/maps/clinics/nearby', { params });
  return extractData<NearbyClinic[]>(response);
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const response = await api.get('/maps/geocode', { params: { address } });
  return extractData<GeocodeResult>(response);
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/services/maps.service.ts
git -c user.name="a-hygge" -c user.email="nguyenthituanh135@gmail.com" commit -m "feat(maps): add mobile maps API service"
```

---

## Task 7: useUserLocation Hook

**Files:**
- Create: `mobile/src/hooks/use-user-location.ts`

- [ ] **Step 1: Create location hook**

```typescript
// mobile/src/hooks/use-user-location.ts
import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';

interface UserLocation {
  lat: number;
  lng: number;
}

interface UseUserLocationReturn {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Cần cấp quyền truy cập vị trí');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError('Không thể lấy vị trí hiện tại');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { location, loading, error, refresh: fetchLocation };
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/use-user-location.ts
git -c user.name="a-hygge" -c user.email="nguyenthituanh135@gmail.com" commit -m "feat(maps): add useUserLocation hook"
```

---

## Task 8: ClinicMapView Component

**Files:**
- Create: `mobile/src/components/maps/ClinicMapView.tsx`

- [ ] **Step 1: Create the ClinicMapView component**

```tsx
// mobile/src/components/maps/ClinicMapView.tsx
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MapView, { Marker, Callout, type Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { figmaColors } from '../../constants/theme';
import type { Clinic } from '../../types';

interface ClinicMapViewProps {
  clinics: Clinic[];
  selectedClinicId: string;
  onSelectClinic: (clinicId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

const DEFAULT_REGION: Region = {
  latitude: 21.0285,
  longitude: 105.8542,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function ClinicMapView({
  clinics,
  selectedClinicId,
  onSelectClinic,
  userLocation,
}: ClinicMapViewProps) {
  const clinicsWithCoords = clinics.filter(
    (c): c is Clinic & { lat: number; lng: number } =>
      c.lat != null && c.lng != null
  );

  const initialRegion: Region = userLocation
    ? {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : clinicsWithCoords.length > 0
      ? {
          latitude: clinicsWithCoords[0].lat,
          longitude: clinicsWithCoords[0].lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : DEFAULT_REGION;

  if (clinicsWithCoords.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="map-marker-off" size={32} color={figmaColors.textSecondary} />
        <Text style={styles.emptyText}>Chưa có dữ liệu vị trí phòng khám</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            title="Vị trí của bạn"
            pinColor={figmaColors.primary}
          />
        )}
        {clinicsWithCoords.map((clinic) => (
          <Marker
            key={clinic.id}
            coordinate={{ latitude: clinic.lat, longitude: clinic.lng }}
            pinColor={
              clinic.id === selectedClinicId ? figmaColors.info : figmaColors.error
            }
            onCalloutPress={() => onSelectClinic(clinic.id)}
          >
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutName} numberOfLines={1}>
                  {clinic.name}
                </Text>
                <Text style={styles.calloutAddress} numberOfLines={2}>
                  {clinic.address}
                </Text>
                <Text style={styles.calloutTap}>Nhấn để chọn</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    height: 220,
    width: '100%',
  },
  empty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: figmaColors.background + '80',
    borderRadius: 14,
    marginBottom: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: figmaColors.textSecondary,
  },
  callout: {
    width: 180,
    padding: 8,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '600',
    color: figmaColors.text,
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: 12,
    color: figmaColors.textSecondary,
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: 11,
    color: figmaColors.info,
    fontWeight: '500',
  },
});
```

- [ ] **Step 2: Commit**

```bash
mkdir -p mobile/src/components/maps
git add mobile/src/components/maps/ClinicMapView.tsx
git -c user.name="a-hygge" -c user.email="nguyenthituanh135@gmail.com" commit -m "feat(maps): add ClinicMapView component with markers"
```

---

## Task 9: Integrate ClinicMapView into Booking Screen

**Files:**
- Modify: `mobile/src/screens/booking/booking-screen.tsx`

- [ ] **Step 1: Add imports**

At the top of `booking-screen.tsx`, add these imports after the existing imports (around line 25):

```typescript
import { ClinicMapView } from '../../components/maps/ClinicMapView';
import { useUserLocation } from '../../hooks/use-user-location';
```

- [ ] **Step 2: Add useUserLocation hook call**

Inside the main `BookingScreen` component function, after the existing state declarations, add:

```typescript
const { location: userLocation } = useUserLocation();
```

- [ ] **Step 3: Add ClinicMapView to the clinic selection step**

In the clinic selection section (around line 722-745), add the `ClinicMapView` between the `SectionHeader` and the clinic list `View`. The section should become:

```tsx
{/* Step 2: Clinic Selection */}
<Reveal visible={showClinic} delay={100}>
  <SectionHeader
    step={2}
    icon="hospital-building"
    iconColor={figmaColors.info}
    title="Chọn phòng khám"
  />
  <ClinicMapView
    clinics={clinics}
    selectedClinicId={selectedClinic}
    onSelectClinic={setSelectedClinic}
    userLocation={userLocation}
  />
  <View style={styles.clinicList}>
    <ClinicCard
      clinic={null}
      selected={selectedClinic === ''}
      onPress={() => setSelectedClinic('')}
    />
    {clinics.map((clinic) => (
      <ClinicCard
        key={clinic.id}
        clinic={clinic}
        selected={selectedClinic === clinic.id}
        onPress={() => setSelectedClinic(clinic.id)}
      />
    ))}
  </View>
</Reveal>
```

- [ ] **Step 4: Verify mobile app compiles**

Run: `cd mobile && npx expo export --platform web 2>&1 | tail -5`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/booking/booking-screen.tsx
git -c user.name="Sgm27" -c user.email="sondaitai27@gmail.com" commit -m "feat(booking): integrate clinic map view in booking flow"
```

Note: Booking screen is owned by Son (Sgm27).

---

## Task 10: Smoke Test Full Flow

- [ ] **Step 1: Start backend**

Run: `cd backend && npm run dev`
Expected: "Server running on http://localhost:3000"

- [ ] **Step 2: Test nearby clinics API**

```bash
curl -s "http://localhost:3000/api/v1/maps/clinics/nearby?lat=21.0285&lng=105.8542&radius=50" | python3 -m json.tool | head -30
```

Expected: JSON array of clinics with `distance` field, sorted by distance ascending.

- [ ] **Step 3: Test geocode API**

```bash
curl -s "http://localhost:3000/api/v1/maps/geocode?address=Ha+Noi" | python3 -m json.tool
```

Expected: `{ "success": true, "data": { "lat": ..., "lng": ..., "displayName": "..." } }`

- [ ] **Step 4: Start mobile app and verify map renders**

Run: `cd mobile && npx expo start`
Navigate to Booking > Select Specialty > Verify MapView appears with clinic markers above the clinic list.

- [ ] **Step 5: Final commit (if any fixes needed)**

Fix any issues found during smoke testing and commit with the appropriate author identity based on which files were modified.
