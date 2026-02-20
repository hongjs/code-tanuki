import { NextRequest, NextResponse } from 'next/server';
import { v7 as uuidv7 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { GitHubClient } from '@/lib/api/github';
import { JiraClient } from '@/lib/api/jira';
import { ClaudeClient } from '@/lib/api/claude';
import { GeminiClient } from '@/lib/api/gemini';
import { GeminiVisionClient } from '@/lib/api/gemini-vision';
import { getStorage } from '@/lib/storage';
import { parseGitHubPRUrl } from '@/lib/utils/parsers';
import { validateReviewRequest } from '@/lib/utils/validation';
import { extractJiraTicketFromTitle } from '@/lib/constants/regex';
import { extractImageUrls } from '@/lib/utils/image-extractor';
import { logger } from '@/lib/logger/winston';
import { Review, ReviewMetadata, StepResult } from '@/types/review';
import { getProviderFromModelId } from '@/lib/constants/models';
import { AIReviewResponse } from '@/types/ai';
import { SYSTEM_PROMPT, buildReviewPrompt } from '@/lib/constants/prompts';
import { readKnowledge, updateKnowledge } from '@/lib/utils/knowledge';

function guessMimeType(url: string): string {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png'; // default
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const reviewId = uuidv7();
  let retryCount = 0;

  const steps: ReviewMetadata['steps'] = {
    fetchGitHub: { success: false, durationMs: 0 },
    aiReview: { success: false, durationMs: 0 },
    postGitHubComments: { success: false, durationMs: 0 },
  };

  try {
    // 1. Validate request
    const body = await request.json();
    const validatedRequest = validateReviewRequest(body);

    logger.info('Starting PR review', {
      reviewId,
      prUrl: validatedRequest.prUrl,
      modelId: validatedRequest.modelId,
    });

    // 2. Parse PR URL
    const { owner, repo, number: prNumber } = parseGitHubPRUrl(validatedRequest.prUrl);
    const repository = `${owner}/${repo}`;

    const storage = getStorage();

    // 3. Fetch GitHub PR
    const githubStepStart = Date.now();
    try {
      const githubToken = process.env.GITHUB_TOKEN!;
      const githubClient = new GitHubClient(githubToken);
      const pr = await githubClient.fetchPR(owner, repo, prNumber);
      
      await storage.saveArtifact(reviewId, 'pr.json', pr);

      steps.fetchGitHub = {
        success: true,
        durationMs: Date.now() - githubStepStart,
      };

      // 5. Extract Jira ticket ID from PR title if not provided
      let jiraTicketId = validatedRequest.jiraTicketId;
      if (!jiraTicketId) {
        const extractedId = extractJiraTicketFromTitle(pr.title);
        if (extractedId) {
          jiraTicketId = extractedId;
          logger.info('Extracted Jira ticket ID from PR title', { jiraTicketId });
        }
      }

      // 6. Fetch Jira ticket (optional)
      let jiraTicket;
      if (jiraTicketId) {
        const jiraStepStart = Date.now();
        try {
          const jiraBaseUrl = process.env.JIRA_BASE_URL!;
          const jiraEmail = process.env.JIRA_EMAIL!;
          const jiraToken = process.env.JIRA_API_TOKEN!;
          const jiraClient = new JiraClient(jiraBaseUrl, jiraEmail, jiraToken);

          jiraTicket = await jiraClient.fetchTicket(jiraTicketId);
          await storage.saveArtifact(reviewId, 'jira.json', jiraTicket);

          steps.fetchJira = {
            success: true,
            durationMs: Date.now() - jiraStepStart,
          };
        } catch (error) {
          logger.warn('Failed to fetch Jira ticket, continuing without it', {
            jiraTicketId,
            error: error instanceof Error ? error.message : String(error),
          });
          steps.fetchJira = {
            success: false,
            durationMs: Date.now() - jiraStepStart,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      // Step: Image Vision Analysis
      const imageVisionStart = Date.now();
      let imageDescriptions: string[] = [];
      const imageItems: Array<{
        url: string;
        headers: Record<string, string>;
        source: string;
        filename: string;
        mimeType: string;
      }> = [];

      // Collect image URLs from PR body
      const prImageUrls = extractImageUrls(pr.body);
      for (const url of prImageUrls) {
        imageItems.push({
          url,
          headers: { Authorization: `Bearer ${githubToken}` },
          source: 'GitHub PR',
          filename: url.split('/').pop()?.split('?')[0] ?? 'image',
          mimeType: guessMimeType(url),
        });
      }

      // Collect image attachments from Jira ticket
      if (jiraTicket?.attachments) {
        const jiraEmail = process.env.JIRA_EMAIL!;
        const jiraToken = process.env.JIRA_API_TOKEN!;
        const basicAuth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
        for (const att of jiraTicket.attachments) {
          imageItems.push({
            url: att.content,
            headers: { Authorization: `Basic ${basicAuth}` },
            source: 'Jira attachment',
            filename: att.filename,
            mimeType: att.mimeType,
          });
        }
      }

      const maxImages = parseInt(process.env.MAX_IMAGES_PER_REVIEW ?? '10');
      const limitedItems = imageItems.slice(0, maxImages);

      if (limitedItems.length > 0) {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
          logger.warn('Images found but GEMINI_API_KEY not set, skipping image analysis', {
            count: limitedItems.length,
          });
          steps.imageVision = {
            success: false,
            durationMs: Date.now() - imageVisionStart,
            error: 'GEMINI_API_KEY not set',
            imagesFound: limitedItems.length,
            imagesAnalyzed: 0,
          };
        } else {
          const visionClient = new GeminiVisionClient(geminiApiKey);
          let analyzed = 0;
          const baseDir = process.env.DATA_DIR || './data/reviews';
          const dataDir = path.join(baseDir, 'data');
          const imagesDir = path.join(dataDir, reviewId, 'images');
          await fs.mkdir(imagesDir, { recursive: true });

          for (let i = 0; i < limitedItems.length; i++) {
            const item = limitedItems[i];
            try {
              const resp = await axios.get(item.url, {
                headers: item.headers,
                responseType: 'arraybuffer',
                timeout: 15000,
              });
              const buffer = Buffer.from(resp.data as ArrayBuffer);
              await fs.writeFile(path.join(imagesDir, `${i + 1}-${item.filename}`), buffer);
              const desc = await visionClient.describeImage(buffer, item.mimeType);
              imageDescriptions.push(`[${item.source}] ${desc}`);
              analyzed++;
            } catch (err) {
              logger.warn('Failed to process image', {
                url: item.url,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }

          await storage.saveArtifact(reviewId, 'image-descriptions.json', imageDescriptions);
          steps.imageVision = {
            success: true,
            durationMs: Date.now() - imageVisionStart,
            imagesFound: limitedItems.length,
            imagesAnalyzed: analyzed,
          };
          logger.info('Image vision analysis complete', {
            reviewId,
            imagesFound: limitedItems.length,
            imagesAnalyzed: analyzed,
          });
        }
      }

      // Read knowledge base for self-learning context
      const knowledge = await readKnowledge();
      if (knowledge) {
        logger.info('Self-learning: loaded knowledge base', { size: knowledge.length });
      }

      // Build and log the prompt that will be sent to AI
      const userPrompt = buildReviewPrompt(
        pr.diff,
        pr.title,
        pr.body,
        jiraTicket,
        validatedRequest.additionalPrompt,
        knowledge || undefined,
        imageDescriptions.length > 0 ? imageDescriptions : undefined
      );

      // Save the actual prompt text sent to AI
      await storage.saveArtifact(reviewId, 'prompt.txt', userPrompt);

      // Save the system prompt
      await storage.saveArtifact(reviewId, 'system-prompt.txt', SYSTEM_PROMPT);

      // Also save metadata about the review request
      await storage.saveArtifact(reviewId, 'req-prompt.json', {
        prTitle: pr.title,
        prBody: pr.body,
        jiraTicketId,
        jiraTicketSummary: jiraTicket?.summary,
        jiraTicketDescription: jiraTicket?.description,
        additionalPrompt: validatedRequest.additionalPrompt,
        modelId: validatedRequest.modelId,
        diffSize: pr.diff.length,
        promptSize: userPrompt.length,
        timestamp: new Date().toISOString()
      });

      // 7. Get AI review from Claude or Gemini
      const aiReviewStepStart = Date.now();
      try {
        const provider = getProviderFromModelId(validatedRequest.modelId);
        let reviewResponse: AIReviewResponse;

        if (provider === 'gemini') {
          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
          }
          const geminiClient = new GeminiClient(geminiApiKey);

          reviewResponse = await geminiClient.reviewPR({
            diff: pr.diff,
            prTitle: pr.title,
            prBody: pr.body,
            jiraTicket,
            additionalPrompt: validatedRequest.additionalPrompt,
            modelId: validatedRequest.modelId,
            provider: 'gemini',
            maxTokens: validatedRequest.maxTokens,
            knowledge: knowledge || undefined,
            imageDescriptions: imageDescriptions.length > 0 ? imageDescriptions : undefined,
          });
        } else {
          const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
          if (!anthropicApiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is not set');
          }
          const claudeClient = new ClaudeClient(anthropicApiKey);

          reviewResponse = await claudeClient.reviewPR({
            diff: pr.diff,
            prTitle: pr.title,
            prBody: pr.body,
            jiraTicket,
            additionalPrompt: validatedRequest.additionalPrompt,
            modelId: validatedRequest.modelId,
            maxTokens: validatedRequest.maxTokens,
            knowledge: knowledge || undefined,
            imageDescriptions: imageDescriptions.length > 0 ? imageDescriptions : undefined,
          });
        }

        await storage.saveArtifact(reviewId, 'res-ai.json', reviewResponse);

        // Log prompt caching stats if available
        if (reviewResponse.cacheTokens) {
          logger.info('Prompt caching stats', {
            reviewId,
            cacheWrite: reviewResponse.cacheTokens.write,
            cacheRead: reviewResponse.cacheTokens.read,
          });
        }

        // Self-learning: update knowledge base if AI returned new knowledge
        if (reviewResponse.knowledgeSection) {
          try {
            await updateKnowledge(reviewResponse.knowledgeSection);
            logger.info('Self-learning: updated knowledge.md', {
              section: reviewResponse.knowledgeSection.substring(0, 100),
            });
          } catch (knowledgeError) {
            logger.warn('Self-learning: failed to update knowledge.md', {
              error: knowledgeError instanceof Error ? knowledgeError.message : String(knowledgeError),
            });
          }
        }

        steps.aiReview = {
          success: true,
          durationMs: Date.now() - aiReviewStepStart,
        };

        // If previewOnly mode, return comments for user approval
        if (validatedRequest.previewOnly) {
          logger.info('Returning preview of AI review', {
            reviewId,
            prNumber,
            commentsCount: reviewResponse.comments.length,
          });

          // Save preview metadata locally
          const previewReview: Review = {
            id: reviewId,
            timestamp: new Date().toISOString(),
            prUrl: validatedRequest.prUrl,
            prNumber,
            repository,
            prTitle: pr.title,
            jiraTicketId,
            modelId: validatedRequest.modelId,
            additionalPrompt: validatedRequest.additionalPrompt,
            status: 'success',
            comments: reviewResponse.comments,
            metadata: {
              durationMs: Date.now() - startTime,
              retryCount,
              tokensUsed: reviewResponse.tokensUsed,
              steps,
            },
          };
          await storage.saveReview(previewReview);

          return NextResponse.json({
            success: true,
            preview: true,
            reviewId,

            prTitle: pr.title,
            prUrl: validatedRequest.prUrl,
            jiraTicketId,
            comments: reviewResponse.comments,
            modelId: validatedRequest.modelId,
            diff: pr.diff, // Send diff to frontend
            tokensUsed: reviewResponse.tokensUsed,
            cacheTokens: reviewResponse.cacheTokens,
            warning: reviewResponse.warning,
          });
        }

        // 8. Post review comments to GitHub
        const postCommentsStepStart = Date.now();
        try {
          const githubClient = new GitHubClient(githubToken);
          await githubClient.postReviewComments(
            owner,
            repo,
            prNumber,
            pr.headSha,
            reviewResponse.comments
          );

          steps.postGitHubComments = {
            success: true,
            durationMs: Date.now() - postCommentsStepStart,
          };

          // 9. Post status comment to Jira (optional)
          if (jiraTicketId) {
            const jiraCommentStepStart = Date.now();
            try {
              const jiraBaseUrl = process.env.JIRA_BASE_URL!;
              const jiraEmail = process.env.JIRA_EMAIL!;
              const jiraToken = process.env.JIRA_API_TOKEN!;
              const jiraClient = new JiraClient(jiraBaseUrl, jiraEmail, jiraToken);

              await jiraClient.postComment(
                jiraTicketId,
                validatedRequest.prUrl,
                reviewResponse.comments.length
              );

              steps.postJiraComment = {
                success: true,
                durationMs: Date.now() - jiraCommentStepStart,
              };
            } catch (error) {
              logger.warn('Failed to post Jira comment, continuing', {
                jiraTicketId,
                error: error instanceof Error ? error.message : String(error),
              });
              steps.postJiraComment = {
                success: false,
                durationMs: Date.now() - jiraCommentStepStart,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          }

          // 10. Save review to storage
          const review: Review = {
            id: reviewId,
            timestamp: new Date().toISOString(),
            prUrl: validatedRequest.prUrl,
            prNumber,
            repository,
            prTitle: pr.title,
            jiraTicketId,
            modelId: validatedRequest.modelId,
            additionalPrompt: validatedRequest.additionalPrompt,
            status: 'success',
            comments: reviewResponse.comments,
            metadata: {
              durationMs: Date.now() - startTime,
              retryCount,
              tokensUsed: reviewResponse.tokensUsed,
              steps,
            },
          };

          await storage.saveReview(review);

          logger.info('Successfully completed PR review', {
            reviewId: review.id,
            prNumber,
            commentsCount: reviewResponse.comments.length,
            durationMs: review.metadata.durationMs,
          });

          return NextResponse.json({
            success: true,
            reviewId: review.id,
            commentsCount: reviewResponse.comments.length,
            prUrl: validatedRequest.prUrl,
          });
        } catch (error) {
          steps.postGitHubComments = {
            success: false,
            durationMs: Date.now() - postCommentsStepStart,
            error: error instanceof Error ? error.message : String(error),
          };
          throw error;
        }
      } catch (error) {
        steps.aiReview = {
          success: false,
          durationMs: Date.now() - aiReviewStepStart,
          error: error instanceof Error ? error.message : String(error),
        };
        throw error;
      }
    } catch (error) {
      if (!steps.fetchGitHub.success) {
        steps.fetchGitHub = {
          success: false,
          durationMs: Date.now() - githubStepStart,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      throw error;
    }
  } catch (error) {
    logger.error('Failed to complete PR review', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Save failed review to storage
    try {
      const body = await request.clone().json();
      const { prUrl, modelId } = body;
      const { owner, repo, number: prNumber } = parseGitHubPRUrl(prUrl);

      const failedReview: Review = {
        id: reviewId,
        timestamp: new Date().toISOString(),
        prUrl,
        prNumber,
        repository: `${owner}/${repo}`,
        prTitle: '', // We might miss title if PR fetch failed
        modelId,
        status: 'error',
        comments: [],
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          durationMs: Date.now() - startTime,
          retryCount,
          steps,
        },
      };

      const storage = getStorage();
      await storage.saveReview(failedReview);
    } catch (saveError) {
      logger.error('Failed to save error review', {
        error: saveError instanceof Error ? saveError.message : String(saveError),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        steps,
      },
      { status: 500 }
    );
  }
}
