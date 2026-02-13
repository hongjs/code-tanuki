import Anthropic from '@anthropic-ai/sdk';
import { ClaudeReviewRequest, ClaudeReviewResponse } from '@/types/claude';
import { ClaudeAPIError } from '@/types/errors';
import { logger } from '../logger/winston';
import { withRetry } from '../utils/retry';
import { SYSTEM_PROMPT, buildReviewPrompt } from '../constants/prompts';

export class ClaudeClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new ClaudeAPIError('ANTHROPIC_API_KEY is not configured. Please set it in your .env file.', {});
    }

    if (!apiKey.startsWith('sk-ant-')) {
      throw new ClaudeAPIError('Invalid ANTHROPIC_API_KEY format. It should start with "sk-ant-"', {});
    }

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

          const maxTokens = request.maxTokens || parseInt(process.env.CLAUDE_MAX_TOKENS || '8192');
          const temperature = parseFloat(process.env.CLAUDE_TEMPERATURE || '0.3');

          const stream = this.client.messages.stream({
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

          const finalMessage = await stream.finalMessage();

          // Extract text content from response
          const content = finalMessage.content[0];
          if (content.type !== 'text') {
            throw new ClaudeAPIError('Unexpected response type from Claude', {
              type: content.type,
            });
          }

          // Parse JSON response
          let reviewResponse: ClaudeReviewResponse = undefined!;
          try {
            // Try to extract JSON from markdown code blocks if present
            // Use greedy match first (complete block), then fallback to open-ended (truncated block)
            const jsonMatch = content.text.match(/```json\s*([\s\S]*?)\s*```/)
              || content.text.match(/```json\s*([\s\S]+)/);
            const jsonText = jsonMatch ? jsonMatch[1] : content.text;

            reviewResponse = JSON.parse(jsonText.trim()) as ClaudeReviewResponse;
          } catch (parseError) {
            const isTruncated = finalMessage.stop_reason === 'max_tokens';

            if (isTruncated) {
              logger.warn(`Claude response was truncated due to max_tokens limit`, {
                maxTokens,
                outputTokens: finalMessage.usage.output_tokens,
                stopReason: finalMessage.stop_reason,
              });
            } else {
              logger.warn(`Claude response contains invalid JSON, attempting to salvage`, {
                stopReason: finalMessage.stop_reason,
                error: parseError instanceof Error ? parseError.message : String(parseError),
                responseText: content.text.substring(0, 500),
              });
            }

            // Always try to salvage partial/malformed response
            try {
              let fixedJson = content.text;

              // Remove markdown code blocks
              fixedJson = fixedJson.replace(/```json\s*/g, '').replace(/```/g, '');

              // Find the start of the JSON
              const startIdx = fixedJson.indexOf('{');
              if (startIdx !== -1) {
                fixedJson = fixedJson.substring(startIdx);
              }

              // Strategy: try to find the last complete comment object by looking for
              // complete JSON objects with closing }
              // A complete comment looks like: { "path": "...", "line": N, "body": "...", "severity": "..." }

              // Find all complete comment objects (ending with } or },)
              const lastCompleteObj = fixedJson.lastIndexOf('}');
              const lastCompleteComma = fixedJson.lastIndexOf('},');

              // Try parsing as-is first (just close structures)
              let salvaged = false;

              // Attempt 1: Truncate to last },  then close array/object
              if (!salvaged && lastCompleteComma > 0) {
                try {
                  let attempt = fixedJson.substring(0, lastCompleteComma + 1);
                  attempt += ']}';
                  reviewResponse = JSON.parse(attempt.trim()) as ClaudeReviewResponse;
                  fixedJson = attempt;
                  salvaged = true;
                } catch {
                  // continue to next attempt
                }
              }

              // Attempt 2: Truncate to last } then close array/object
              if (!salvaged && lastCompleteObj > 0) {
                try {
                  let attempt = fixedJson.substring(0, lastCompleteObj + 1);
                  // Close remaining open structures
                  const ob = (attempt.match(/\[/g) || []).length - (attempt.match(/]/g) || []).length;
                  const oc = (attempt.match(/{/g) || []).length - (attempt.match(/}/g) || []).length;
                  for (let i = 0; i < ob; i++) attempt += ']';
                  for (let i = 0; i < oc; i++) attempt += '}';
                  reviewResponse = JSON.parse(attempt.trim()) as ClaudeReviewResponse;
                  fixedJson = attempt;
                  salvaged = true;
                } catch {
                  // continue to next attempt
                }
              }

              // Attempt 3: Brute force - find all individual complete comment JSON objects via regex
              if (!salvaged) {
                const commentRegex = /\{\s*"path"\s*:\s*"[^"]*"\s*,\s*"line"\s*:\s*\d+\s*(?:,\s*"start_line"\s*:\s*\d+\s*)?,\s*"body"\s*:\s*"(?:[^"\\]|\\.)*"\s*,\s*"severity"\s*:\s*"(?:critical|warning|suggestion)"\s*\}/g;
                const matches = fixedJson.match(commentRegex);
                if (matches && matches.length > 0) {
                  fixedJson = `{"comments":[${matches.join(',')}]}`;
                  reviewResponse = JSON.parse(fixedJson) as ClaudeReviewResponse;
                  salvaged = true;
                }
              }

              if (!salvaged) {
                throw new Error('No complete comment objects found to salvage');
              }

              reviewResponse.warning = isTruncated
                ? `AI response was truncated due to token limit. Some comments may be missing.`
                : `AI response contained invalid JSON and was partially recovered. Some comments may be missing.`;

              logger.info(`Successfully salvaged Claude response`, {
                originalLength: content.text.length,
                salvaged: reviewResponse.comments?.length || 0,
                wasTruncated: isTruncated,
              });
            } catch (salvageError) {
              logger.error(`Failed to salvage Claude response`, {
                error: salvageError instanceof Error ? salvageError.message : String(salvageError),
                responseText: content.text.substring(0, 500),
              });
              throw new ClaudeAPIError(
                isTruncated
                  ? 'Claude response was truncated due to token limit. Please increase max tokens or reduce the diff size.'
                  : 'Failed to parse Claude response as JSON',
                { parseError: parseError instanceof Error ? parseError.message : String(parseError) }
              );
            }
          }

          // Validate response structure
          if (!reviewResponse.comments || !Array.isArray(reviewResponse.comments)) {
            throw new ClaudeAPIError('Invalid response structure: missing comments array', {
              response: reviewResponse,
            });
          }

          // Add token usage to response
          reviewResponse.tokensUsed = {
            input: finalMessage.usage.input_tokens,
            output: finalMessage.usage.output_tokens,
          };

          logger.info(`Successfully received AI review from Claude`, {
            commentsCount: reviewResponse.comments.length,
            tokensUsed: reviewResponse.tokensUsed,
          });

          return reviewResponse;
        } catch (error: unknown) {
          if (error instanceof ClaudeAPIError) {
            throw error;
          }

          const message = error instanceof Error ? error.message : 'Unknown error';

          // Provide clearer error messages for common authentication issues
          if (message.includes('authentication') || message.includes('apiKey') || message.includes('authToken')) {
            logger.error(`Claude API authentication failed`, { error: message });
            throw new ClaudeAPIError(
              'Claude API authentication failed. Please verify your ANTHROPIC_API_KEY in the .env file.',
              { originalError: message }
            );
          }

          if (message.includes('invalid_api_key') || message.includes('401')) {
            logger.error(`Invalid Claude API key`, { error: message });
            throw new ClaudeAPIError(
              'Invalid ANTHROPIC_API_KEY. Please check your API key in the .env file.',
              { originalError: message }
            );
          }

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
