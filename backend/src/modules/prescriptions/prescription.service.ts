import { prisma } from '../../config/database';
import { visionAnalysis } from '../../utils/ai-client';
import { uploadToCloudinary } from '../../utils/cloudinary';
import type { SavePrescriptionInput, GetPrescriptionsQuery } from './prescription.schemas';

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

const OCR_PROMPT = `Analyze this medical prescription image. Extract all medicines with:
- name: medicine name
- dosage: strength (e.g., 500mg)
- quantity: number of pills/units
- frequency: how often to take (e.g., 2 times/day after meals)
Return as JSON: { "medicines": [{ "name": "...", "dosage": "...", "quantity": "...", "frequency": "..." }], "rawText": "full text" }
Respond ONLY with valid JSON, no markdown.`;

export class PrescriptionService {
  static async ocrPrescription(imageBuffer: Buffer): Promise<OcrResult> {
    // Upload image to Cloudinary
    const uploaded = await uploadToCloudinary(imageBuffer, 'prescriptions');
    const imageUrl = uploaded.secure_url;

    // Call AI vision analysis
    const aiResponse = await visionAnalysis(imageUrl, OCR_PROMPT);

    // Parse JSON from response (handle possible markdown wrapping)
    const jsonStr = aiResponse.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    let parsed: { medicines: OcrMedicine[]; rawText?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return raw text as a single medicine entry
      parsed = {
        medicines: [],
        rawText: aiResponse,
      };
    }

    return {
      imageUrl,
      medicines: parsed.medicines ?? [],
      rawText: parsed.rawText ?? aiResponse,
    };
  }

  static async savePrescription(userId: string, input: SavePrescriptionInput) {
    const prescription = await prisma.prescription.create({
      data: {
        userId,
        imageUrl: input.imageUrl,
        ocrData: input.ocrData as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    return prescription;
  }

  static async getMyPrescriptions(userId: string, query: GetPrescriptionsQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reminders: {
            where: { isActive: true },
            select: {
              id: true,
              medicineName: true,
              dosage: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.prescription.count({ where: { userId } }),
    ]);

    return {
      prescriptions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
