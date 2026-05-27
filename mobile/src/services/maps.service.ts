/** Service phía mobile gọi các endpoint /maps của backend (nearby clinics, geocoding). */
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

/**
 * Gọi GET /maps/clinics/nearby tìm các phòng khám trong bán kính cho trước quanh toạ độ user.
 * Trả về mảng NearbyClinic đã sắp xếp theo khoảng cách.
 */
export async function getNearbyClinics(params: {
  lat: number;
  lng: number;
  radius?: number;
  specialtyId?: string;
}): Promise<NearbyClinic[]> {
  const response = await api.get('/maps/clinics/nearby', { params });
  return extractData<NearbyClinic[]>(response);
}

/**
 * Gọi GET /maps/geocode chuyển địa chỉ dạng text sang toạ độ lat/lng. Trả về GeocodeResult.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const response = await api.get('/maps/geocode', { params: { address } });
  return extractData<GeocodeResult>(response);
}
