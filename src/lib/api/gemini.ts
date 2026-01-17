import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIReviewRequest, AIReviewResponse } from '@/types/ai';
import { GeminiAPIError } from '@/types/errors';
import { logger } from '../logger/winston';
import { withRetry } from '../utils/retry';
import { SYSTEM_PROMPT, buildReviewPrompt } from '../constants/prompts';

export class GeminiClient {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new GeminiAPIError('GEMINI_API_KEY is not configured. Please set it in your .env file.', {});
    }

    this.client = new GoogleGenerativeAI(apiKey);
  }

  async reviewPR(request: AIReviewRequest): Promise<AIReviewResponse> {
    return withRetry(
      async () => {
        try {
          logger.info(`Requesting AI review from Gemini`, {
            modelId: request.modelId,
            hasJiraTicket: !!request.jiraTicket,
            diffLength: request.diff.length,
          });

          const userPrompt = buildReviewPrompt(
            request.diff,
            request.prTitle,
            request.prBody,
            request.jiraTicket,
            request.additionalPrompt
          );

          logger.info(`User prompt:`, userPrompt.substring(0, 100));

          const maxTokens = request.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS || '8192');
          const temperature = parseFloat(process.env.GEMINI_TEMPERATURE || '0.3');

          const model = this.client.getGenerativeModel({
            model: request.modelId,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
              responseMimeType: 'application/json',
            },
          });

          const result = await model.generateContent(userPrompt);
          const response = result.response;
          const text = response.text();

          logger.info(`Gemini response:`, text.substring(0, 100));

          // Parse JSON response
          let reviewResponse: AIReviewResponse;
          try {
            // Try multiple extraction strategies
            let jsonText = text;

            // Strategy 1: Check if it's wrapped in markdown code blocks
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              jsonText = jsonMatch[1];
            }

            // Strategy 2: Find JSON object boundaries
            const jsonStartIndex = jsonText.indexOf('{');
            const jsonEndIndex = jsonText.lastIndexOf('}');
            
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
              jsonText = jsonText.substring(jsonStartIndex, jsonEndIndex + 1);
            }

            // Parse the extracted JSON
            reviewResponse = JSON.parse(jsonText.trim()) as AIReviewResponse;
          } catch (parseError) {
            // If parsing fails, try to salvage partial response
            logger.warn(`Initial JSON parse failed, attempting to salvage response`, {
              error: parseError instanceof Error ? parseError.message : String(parseError),
            });

            try {
              // Try to fix truncated JSON by closing arrays and objects
              let fixedJson = text;

              // Remove markdown code blocks
              fixedJson = fixedJson.replace(/```json\s*/g, '').replace(/```\s*/g, '');

              // Find the start of the JSON
              const startIdx = fixedJson.indexOf('{');
              if (startIdx === -1) {
                // Try to find array start
                const arrayStart = fixedJson.indexOf('[');
                if (arrayStart !== -1) {
                  fixedJson = fixedJson.substring(arrayStart);
                }
              } else {
                fixedJson = fixedJson.substring(startIdx);
              }

              // Remove any trailing incomplete string
              // Look for unclosed quotes that indicate truncation
              const lastQuote = fixedJson.lastIndexOf('"');
              const secondLastQuote = fixedJson.lastIndexOf('"', lastQuote - 1);

              // If we have an odd number of quotes, we have an incomplete string
              const quoteCount = (fixedJson.match(/"/g) || []).length;
              if (quoteCount % 2 !== 0) {
                // Find the last complete key-value pair or object
                let cutPoints = [
                  fixedJson.lastIndexOf('},'),
                  fixedJson.lastIndexOf('}]'),
                  fixedJson.lastIndexOf('",'),
                ];
                const cutPoint = Math.max(...cutPoints);

                if (cutPoint > 0) {
                  // Cut at the last complete element
                  fixedJson = fixedJson.substring(0, cutPoint + 2);
                }
              }

              // Count unclosed brackets and braces
              const openBraces = (fixedJson.match(/{/g) || []).length;
              const closeBraces = (fixedJson.match(/}/g) || []).length;
              const openBrackets = (fixedJson.match(/\[/g) || []).length;
              const closeBrackets = (fixedJson.match(/]/g) || []).length;

              // Close any remaining open structures
              for (let i = 0; i < openBrackets - closeBrackets; i++) {
                fixedJson += ']';
              }
              for (let i = 0; i < openBraces - closeBraces; i++) {
                fixedJson += '}';
              }

              reviewResponse = JSON.parse(fixedJson.trim()) as AIReviewResponse;
              logger.info(`Successfully salvaged truncated Gemini response with ${reviewResponse.comments?.length || 0} comments`);
            } catch (salvageError) {
              logger.error(`Failed to parse Gemini response as JSON`, {
                error: parseError instanceof Error ? parseError.message : String(parseError),
                responseText: text.substring(0, 500),
              });
              throw new GeminiAPIError('Failed to parse Gemini response as JSON. Response may be truncated.', {
                parseError: parseError instanceof Error ? parseError.message : String(parseError),
              });
            }
          }

          // Validate response structure
          if (!reviewResponse.comments || !Array.isArray(reviewResponse.comments)) {
            throw new GeminiAPIError('Invalid response structure: missing comments array', {
              response: reviewResponse,
            });
          }

          // Add token usage to response if available
          const usageMetadata = response.usageMetadata;
          if (usageMetadata) {
            reviewResponse.tokensUsed = {
              input: usageMetadata.promptTokenCount || 0,
              output: usageMetadata.candidatesTokenCount || 0,
            };
          }

          logger.info(`Successfully received AI review from Gemini`, {
            commentsCount: reviewResponse.comments.length,
            tokensUsed: reviewResponse.tokensUsed,
          });

          return reviewResponse;
        } catch (error: unknown) {
          if (error instanceof GeminiAPIError) {
            throw error;
          }

          const message = error instanceof Error ? error.message : 'Unknown error';

          // Provide clearer error messages for common authentication issues
          if (message.includes('API_KEY') || message.includes('apiKey') || message.includes('401')) {
            logger.error(`Gemini API authentication failed`, { error: message });
            throw new GeminiAPIError(
              'Gemini API authentication failed. Please verify your GEMINI_API_KEY in the .env file.',
              { originalError: message }
            );
          }

          logger.error(`Failed to get AI review from Gemini`, { error: message });
          throw new GeminiAPIError(`Failed to get AI review: ${message}`, {
            modelId: request.modelId,
          });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
        shouldRetry: (error) => {
          // Don't retry on parse errors or validation errors
          if (
            error instanceof GeminiAPIError &&
            (error.message.includes('parse') || error.message.includes('Invalid response'))
          ) {
            return false;
          }
          return true;
        },
      }
    );
  }
}
