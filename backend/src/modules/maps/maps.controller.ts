/** Controller xử lý HTTP cho module bản đồ: tìm phòng khám gần, geocoding và reverse geocoding. */
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

/**
 * GET /maps/clinics/nearby — tìm các phòng khám trong bán kính cho trước quanh vị trí người dùng.
 */
export async function nearbyClinics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = nearbyClinicsQuerySchema.parse(req.query);
    const results = await getNearbyClinics(query);
    sendSuccess(res, results);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /maps/geocode — chuyển địa chỉ dạng text sang toạ độ lat/lng thông qua Nominatim.
 */
export async function geocode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = geocodeQuerySchema.parse(req.query);
    const result = await geocodeAddress(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /maps/reverse-geocode — chuyển toạ độ lat/lng sang địa chỉ dạng text thông qua Nominatim.
 */
export async function reverseGeocodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = reverseGeocodeQuerySchema.parse(req.query);
    const result = await reverseGeocode(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
