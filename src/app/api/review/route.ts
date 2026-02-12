import { NextRequest, NextResponse } from 'next/server';
import { v7 as uuidv7 } from 'uuid';
import { GitHubClient } from '@/lib/api/github';
import { JiraClient } from '@/lib/api/jira';
import { ClaudeClient } from '@/lib/api/claude';
import { GeminiClient } from '@/lib/api/gemini';
import { getStorage } from '@/lib/storage';
import { parseGitHubPRUrl } from '@/lib/utils/parsers';
import { validateReviewRequest } from '@/lib/utils/validation';
import { extractJiraTicketFromTitle } from '@/lib/constants/regex';
import { logger } from '@/lib/logger/winston';
import { Review, ReviewMetadata, StepResult } from '@/types/review';
import { getProviderFromModelId } from '@/lib/constants/models';
import { AIReviewResponse } from '@/types/ai';
import { SYSTEM_PROMPT, buildReviewPrompt } from '@/lib/constants/prompts';

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

      // Build and log the prompt that will be sent to AI
      const userPrompt = buildReviewPrompt(
        pr.diff,
        pr.title,
        pr.body,
        jiraTicket,
        validatedRequest.additionalPrompt
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
          });
        }

        await storage.saveArtifact(reviewId, 'res-ai.json', reviewResponse);

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
