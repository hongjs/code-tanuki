import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../logger/winston';

export class GeminiVisionClient {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async describeImage(buffer: Buffer, mimeType: string): Promise<string> {
    const modelId = process.env.GEMINI_VISION_MODEL ?? 'gemini-2.0-flash';
    const model = this.client.getGenerativeModel({ model: modelId });

    logger.info('Analyzing image with Gemini Vision', { modelId, mimeType, bytes: buffer.length });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: buffer.toString('base64'),
        },
      },
      'Describe what this image shows in the context of a software code review. Be concise (2-3 sentences).',
    ]);

    return result.response.text();
  }
}
