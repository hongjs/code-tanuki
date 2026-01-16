import Anthropic from '@anthropic-ai/sdk';
import { ClaudeReviewRequest, ClaudeReviewResponse } from '@/types/claude';
import { ClaudeAPIError } from '@/types/errors';
import { logger } from '../logger/winston';
import { withRetry } from '../utils/retry';
import { SYSTEM_PROMPT, buildReviewPrompt } from '../constants/prompts';

export class ClaudeClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  async reviewPR(request: ClaudeReviewRequest): Promise<ClaudeReviewResponse> {
    return withRetry(
      async () => {
        try {
          logger.info(`Requesting AI review from Claude`, {
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

          const maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096');
          const temperature = parseFloat(process.env.CLAUDE_TEMPERATURE || '0.3');

          const response = await this.client.messages.create({
            model: request.modelId,
            max_tokens: maxTokens,
            temperature,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          });

          // Extract text content from response
          const content = response.content[0];
          if (content.type !== 'text') {
            throw new ClaudeAPIError('Unexpected response type from Claude', {
              type: content.type,
            });
          }

          // Parse JSON response
          let reviewResponse: ClaudeReviewResponse;
          try {
            // Try to extract JSON from markdown code blocks if present
            const jsonMatch = content.text.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : content.text;

            reviewResponse = JSON.parse(jsonText.trim()) as ClaudeReviewResponse;
          } catch (parseError) {
            logger.error(`Failed to parse Claude response as JSON`, {
              error: parseError instanceof Error ? parseError.message : String(parseError),
              responseText: content.text.substring(0, 500),
            });
            throw new ClaudeAPIError('Failed to parse Claude response as JSON', {
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
            });
          }

          // Validate response structure
          if (!reviewResponse.comments || !Array.isArray(reviewResponse.comments)) {
            throw new ClaudeAPIError('Invalid response structure: missing comments array', {
              response: reviewResponse,
            });
          }

          logger.info(`Successfully received AI review from Claude`, {
            commentsCount: reviewResponse.comments.length,
            tokensUsed: {
              input: response.usage.input_tokens,
              output: response.usage.output_tokens,
            },
          });

          return reviewResponse;
        } catch (error: unknown) {
          if (error instanceof ClaudeAPIError) {
            throw error;
          }

          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to get AI review from Claude`, { error: message });
          throw new ClaudeAPIError(`Failed to get AI review: ${message}`, {
            modelId: request.modelId,
          });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
        shouldRetry: (error, attempt) => {
          // Don't retry on parse errors or validation errors
          if (
            error instanceof ClaudeAPIError &&
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
