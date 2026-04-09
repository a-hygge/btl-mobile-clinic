# Maps Module Design

**Date**: 2026-04-09
**Status**: Approved
**Owner**: Tu Anh (a-hygge) — Maps module falls under Search/Maps ownership

## Overview

New standalone backend module `maps/` providing geocoding (via Nominatim/OpenStreetMap) and distance calculation (Haversine) APIs. Paired with an interactive `MapView` on mobile using `react-native-maps` (already installed, not yet used). Zero external API keys required.

## Motivation

The booking flow currently shows clinic selection as text-only (name + address). Adding an interactive map improves UX for demo and helps patients visualize clinic locations and proximity.

## Constraints

- **Free only** — no Google Maps API key, no paid services
- **Separate module** — must not modify existing `clinics/`, `appointments/`, or `booking/` modules
- **Packages already installed** — `react-native-maps` and `expo-location` in mobile, `axios` in backend

## Backend Module Structure

```
backend/src/modules/maps/
├── maps.controller.ts    # HTTP handlers
├── maps.service.ts       # Business logic (Nominatim calls + Haversine)
├── maps.routes.ts        # Route definitions
├── maps.dto.ts           # Zod schemas + types
├── maps.utils.ts         # Haversine formula helper
└── index.ts              # Exports
```

## API Endpoints

All endpoints prefixed with `/api/v1/maps`. All require Bearer auth.

### GET `/maps/clinics/nearby`

Find clinics near a given location, sorted by distance.

**Query params:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `lat` | number | yes | — | User latitude |
| `lng` | number | yes | — | User longitude |
| `radius` | number | no | 20 | Max distance in km |
| `specialtyId` | string (UUID) | no | — | Filter by specialty |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Phong kham ABC",
      "address": "123 Tran Duy Hung, Ha Noi",
      "lat": 21.0285,
      "lng": 105.8542,
      "phone": "024-1234-5678",
      "imageUrl": "https://...",
      "openingHours": "08:00-17:00",
      "distance": 2.3
    }
  ]
}
```

**Logic:**
1. Query all clinics from DB where `lat` and `lng` are not null, `deleted_at` is null
2. If `specialtyId` provided, join through `doctors` table to filter clinics that have doctors with that specialty
3. Compute Haversine distance for each clinic
4. Filter by `radius`, sort ascending by distance
5. Return results

### GET `/maps/geocode`

Convert address text to coordinates using Nominatim.

**Query params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | yes | Address to geocode |

**Response:**
```json
{
  "success": true,
  "data": {
    "lat": 21.0285,
    "lng": 105.8542,
    "displayName": "123 Tran Duy Hung, Cau Giay, Ha Noi, Viet Nam"
  }
}
```

**Logic:**
1. Call `https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1`
2. Set `User-Agent` header (Nominatim requirement)
3. Return first result's lat, lon, display_name
4. Return 404 if no results

### GET `/maps/reverse-geocode`

Convert coordinates to address using Nominatim.

**Query params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | number | yes | Latitude |
| `lng` | number | yes | Longitude |

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "123 Tran Duy Hung, Cau Giay, Ha Noi",
    "displayName": "123 Tran Duy Hung, Cau Giay, Ha Noi, Viet Nam"
  }
}
```

**Logic:**
1. Call `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json`
2. Set `User-Agent` header
3. Return address and display_name
4. Return 404 if no results

## Haversine Utility

`maps.utils.ts` exports a pure function:

```typescript
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number // returns distance in km
```

Uses the standard Haversine formula with Earth radius = 6371 km.

## Mobile Integration

### New component: `ClinicMapView`

Location: `mobile/src/components/maps/ClinicMapView.tsx`

- Renders `react-native-maps` `MapView` with markers for each clinic
- Props: `clinics` array (with lat/lng), `onClinicSelect` callback, optional `userLocation`
- Each marker shows clinic name; tap opens callout with name + address + distance
- Tap callout selects clinic in booking flow

### New hook: `useUserLocation`

Location: `mobile/src/hooks/use-user-location.ts`

- Wraps `expo-location` to request permission and get current position
- Returns `{ location, loading, error, refresh }`

### Integration point in booking flow

The `ClinicMapView` component will be used inside the booking screen's clinic selection step. The booking screen will import and render it — this is a minimal change (adding the map below the existing clinic list), but the map component itself is fully self-contained.

## Nominatim Usage Policy

- Max 1 request per second (enforced via simple delay in service)
- Must set a meaningful `User-Agent` header (e.g., `healthcare-booking-app/1.0`)
- No bulk geocoding — only on-demand for admin adding new clinics

## Error Handling

- Nominatim unavailable → return 503 with message "Geocoding service unavailable"
- No results → return 404 with message "Address not found"
- Missing/invalid params → return 400 with Zod validation errors
- Standard `{ success: false, error: { code, message } }` format per project conventions

## Testing

- Unit test for Haversine formula (known coordinate pairs)
- Integration test for `/maps/clinics/nearby` with seeded clinic data
- Mock Nominatim calls in geocode/reverse-geocode tests
