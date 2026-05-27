/** Khai báo route HTTP cho module bản đồ (nearby clinics, geocode, reverse-geocode). */
import { Router } from 'express';
import { nearbyClinics, geocode, reverseGeocodeHandler } from './maps.controller';

export const mapsRouter = Router();

mapsRouter.get('/clinics/nearby', nearbyClinics);
mapsRouter.get('/geocode', geocode);
mapsRouter.get('/reverse-geocode', reverseGeocodeHandler);
