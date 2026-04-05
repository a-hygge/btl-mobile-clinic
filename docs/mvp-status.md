# MVP Status

Last updated: 2026-04-05

## What Is Already Working

- Backend auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `GET /users/me`
- Backend discovery:
  - `GET /specialties`
  - `GET /clinics`
  - `GET /clinics/:id`
  - `GET /doctors`
  - `GET /doctors/:id`
  - `GET /doctors/:id/slots`
- Backend booking:
  - `POST /appointments`
  - `GET /appointments/me`
  - `GET /appointments/:id`
  - `PUT /appointments/:id/cancel`
  - `PUT /appointments/:id/confirm`
  - `PUT /appointments/:id/complete`
  - `POST /reviews`
  - doctor schedule registration/listing
- Mobile:
  - Expo Router app shell
  - login/register screens
  - auth gate and loading shell

## MVP Definition

Patient can:

1. Register or log in
2. Browse doctors
3. View doctor detail
4. See available slots
5. Create an appointment
6. See their appointment list

When all 6 are working from the mobile app, we can call MVP done.

## Current Gaps To MVP

- Seed data still needs reliable `doctor_services` and `time_slots` for booking demos
- Mobile home still needs to be upgraded from auth shell to real discovery flow
- Mobile doctor detail and booking flow still need to be finalized
- Mobile appointments screen still needs to be finalized

## Commit Discipline

Always split commits by module owner:

- `c0ncobebe1 / trungkiennguyen7878@gmail.com`: auth, users/profile, chatbot
- `a-hygge / nguyenthituanh135@gmail.com`: search, doctors/clinics, notifications, prescriptions, maps
- `Sgm27 / sondaitai27@gmail.com`: appointments, schedules, reviews, smart scheduling
- `h3nr1-d14z / leduchieu101@gmail.com`: shared infra, admin, payments, health, docker, shared mobile shell/store/navigation

Do not combine cross-owner files in one commit.

## UI Direction

The mobile app should feel polished and attractive for demo day:

- avoid plain placeholder CRUD screens
- use stronger visual hierarchy and spacing
- add motion and animation where it helps
- use `lottie-react-native` for loading or hero moments when possible
- prefer smooth, demo-friendly UX over raw feature count
