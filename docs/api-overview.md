# API Overview

Base URL: `http://localhost:3000/api/v1`

## Auth (Kien)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | No | Register new user |
| POST | /auth/login | No | Login, returns JWT |
| POST | /auth/forgot-password | No | Send OTP to email |
| POST | /auth/reset-password | No | Verify OTP + new password |
| POST | /auth/refresh | No | Refresh access token |

## Users (Kien)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /users/me | Yes | Get current user profile |
| PUT | /users/me | Yes | Update profile |
| PUT | /users/me/avatar | Yes | Upload avatar |
| PUT | /users/me/password | Yes | Change password |

## Doctors (Tu Anh search, Hieu admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /doctors | No | Search doctors (query, specialty, sort) |
| GET | /doctors/:id | No | Doctor detail + reviews |
| GET | /doctors/:id/slots | No | Available time slots by date |
| GET | /doctors/:id/services | No | Services offered by doctor |
| GET | /doctors/:id/reviews | No | Doctor reviews |

## Clinics (Tu Anh)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /clinics | No | Search clinics |
| GET | /clinics/nearby | No | Find by lat/lng/radius |
| GET | /clinics/:id | No | Clinic detail + doctors |

## Appointments (Son)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /appointments | Patient | Create appointment |
| GET | /appointments/me | Yes | My appointments (filter by status) |
| GET | /appointments/:id | Yes | Appointment detail |
| PUT | /appointments/:id/cancel | Patient | Cancel appointment |
| PUT | /appointments/:id/confirm | Doctor | Confirm appointment |
| PUT | /appointments/:id/complete | Doctor | Mark completed + diagnosis |

## Schedules (Son + Hieu)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /schedules/doctor/register | Doctor | Register for work shifts |
| GET | /schedules/doctor/me | Doctor | My registered shifts |

## Reviews (Son)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /reviews | Patient | Create review (after completed) |

## Follow-ups (Son)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /follow-ups | Doctor | Create follow-up reminder |
| GET | /follow-ups/me | Patient | My follow-up reminders |

## Payments (Hieu)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /payments/create | Patient | Create payment (VNPAY/Momo) |
| POST | /payments/vnpay/ipn | No | VNPAY IPN callback |
| POST | /payments/momo/ipn | No | Momo IPN callback |
| GET | /payments/vnpay/return | No | VNPAY return URL |
| GET | /payments/me | Yes | Payment history |

## Health Metrics (Hieu)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /health-metrics | Patient | Record health metric |
| GET | /health-metrics/me | Patient | Get metrics (filter type, date range) |
| GET | /health-alerts/me | Patient | Get health alerts |

## Prescriptions (Tu Anh)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /prescriptions/ocr | Patient | Upload image → OCR extract |
| POST | /prescriptions | Patient | Save prescription |
| GET | /prescriptions/me | Patient | My prescriptions |

## Medicine Reminders (Tu Anh)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /medicine-reminders | Patient | Create reminder |
| GET | /medicine-reminders/me | Patient | My reminders |
| PUT | /medicine-reminders/:id | Patient | Update reminder |
| PUT | /medicine-reminders/:id/taken | Patient | Mark as taken |
| PUT | /medicine-reminders/:id/skip | Patient | Mark as skipped |

## Notifications (Tu Anh)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /notifications/me | Yes | My notifications |
| PUT | /notifications/:id/read | Yes | Mark as read |
| PUT | /notifications/read-all | Yes | Mark all as read |

## AI (Kien chatbot, Son smart-schedule, Hieu health)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /ai/chat | Patient | Send message to chatbot |
| GET | /ai/chat/sessions | Patient | List chat sessions |
| GET | /ai/chat/sessions/:id | Patient | Get session messages |
| POST | /ai/symptoms | Patient | Extract symptoms → suggest specialty |
| POST | /ai/smart-schedule | Patient | AI suggest optimal time slots |
| POST | /ai/rank-doctors | Patient | AI rank doctors for symptoms |
| GET | /ai/health-tips | Patient | AI health tips based on metrics |
| GET | /ai/patient-forecast | Admin | Predict patient volume |

## Admin (Hieu)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /admin/dashboard | Admin | Statistics overview |
| GET | /admin/doctors | Admin | List all doctors (incl. pending) |
| PUT | /admin/doctors/:id/approve | Admin | Approve doctor |
| PUT | /admin/doctors/:id/reject | Admin | Reject doctor (with reason) |
| POST | /admin/clinics | Admin | Create clinic |
| PUT | /admin/clinics/:id | Admin | Update clinic |
| DELETE | /admin/clinics/:id | Admin | Soft delete clinic |
| POST | /admin/specialties | Admin | Create specialty |
| PUT | /admin/specialties/:id | Admin | Update specialty |
| POST | /admin/services | Admin | Create service |
| PUT | /admin/services/:id | Admin | Update service |
| DELETE | /admin/services/:id | Admin | Soft delete service |
| POST | /admin/work-schedules | Admin | Generate work schedules for month |
