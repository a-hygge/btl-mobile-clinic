/** Client gọi API AI chung (OpenRouter/OpenAI compatible) cho chat completion và phân tích ảnh (OCR). */
import { env } from '../config/env';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface ChatCompletionResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

/**
 * Hàm gọi AI chat completion chung — tương thích với OpenRouter, OpenAI hoặc bất kỳ provider nào
 * theo chuẩn /chat/completions. OpenRouter cho phép chọn model: Gemini, GPT, Claude, Llama...
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const model = options?.model ?? env.AI_MODEL;
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 2048;

  // Gọi OpenRouter/OpenAI /chat/completions: gửi messages + model + temperature, nhận lại nội dung text từ AI.
  const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.AI_API_KEY}`,
      ...(env.AI_PROVIDER === 'openrouter' && {
        'HTTP-Referer': env.APP_URL,
        'X-Title': 'BTL Healthcare',
      }),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[ai-client] non-ok response', {
      status: response.status,
      url: `${env.AI_BASE_URL}/chat/completions`,
      model,
      bodyPreview: error.slice(0, 1000),
    });
    throw new Error(`AI API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content ?? '';
}

/**
 * Gửi ảnh kèm prompt cho AI multimodal (gemini-2.0-flash, gpt-4o...) để phân tích ảnh.
 * Dùng cho OCR đơn thuốc trong module prescription.
 */
export async function visionAnalysis(
  imageUrl: string,
  prompt: string,
  options?: { model?: string }
): Promise<string> {
  const model = options?.model ?? env.AI_MODEL;

  return chatCompletion(
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    { model }
  );
}
