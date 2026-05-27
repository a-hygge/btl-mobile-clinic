/** Service phía mobile gọi các endpoint /prescriptions của backend (OCR, lưu, lấy danh sách đơn thuốc). */
import { api, extractData } from './api';

export interface OcrMedicine {
  name: string;
  dosage: string;
  quantity: string;
  frequency: string;
}

export interface OcrResult {
  imageUrl: string;
  medicines: OcrMedicine[];
  rawText: string;
}

export interface Prescription {
  id: string;
  userId: string;
  doctorId: string | null;
  imageUrl: string;
  ocrData: {
    medicines: OcrMedicine[];
    rawText?: string;
  } | null;
  createdAt: string;
  reminders?: Array<{
    id: string;
    medicineName: string;
    dosage: string;
    isActive: boolean;
  }>;
}

/**
 * Gọi POST /prescriptions/ocr — upload ảnh đơn thuốc (multipart/form-data) để backend OCR bằng AI.
 * Trả về OcrResult gồm danh sách thuốc và raw text. Timeout 60s vì OCR có thể chậm.
 */
export async function ocrPrescription(imageUri: string): Promise<OcrResult> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  } as unknown as Blob);

  const response = await api.post('/prescriptions/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // OCR can take longer
  });
  return extractData<OcrResult>(response);
}

/**
 * Gọi POST /prescriptions lưu đơn thuốc đã OCR (imageUrl + danh sách thuốc) vào DB.
 * Trả về bản ghi Prescription vừa tạo.
 */
export async function savePrescription(
  imageUrl: string,
  ocrData: { medicines: OcrMedicine[]; rawText?: string }
): Promise<Prescription> {
  const response = await api.post('/prescriptions', { imageUrl, ocrData });
  return extractData<Prescription>(response);
}

/**
 * Gọi GET /prescriptions/me lấy danh sách đơn thuốc của user hiện tại (có phân trang).
 * Trả về mảng Prescription kèm danh sách nhắc thuốc active của từng đơn.
 */
export async function getMyPrescriptions(params?: {
  page?: number;
  limit?: number;
}): Promise<Prescription[]> {
  const response = await api.get('/prescriptions/me', { params });
  return extractData<Prescription[]>(response);
}
