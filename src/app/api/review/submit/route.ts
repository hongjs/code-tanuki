import { NextRequest, NextResponse } from 'next/server';
import { v7 as uuidv7 } from 'uuid';
import { GitHubClient } from '@/lib/api/github';
import { JiraClient } from '@/lib/api/jira';
import { getStorage } from '@/lib/storage';
import { parseGitHubPRUrl } from '@/lib/utils/parsers';
import { validateSubmitReviewRequest } from '@/lib/utils/validation';
import { extractJiraTicketFromTitle } from '@/lib/constants/regex';
import { logger } from '@/lib/logger/winston';
import { Review, ReviewMetadata } from '@/types/review';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const steps: ReviewMetadata['steps'] = {
    fetchGitHub: { success: false, durationMs: 0 },
    aiReview: { success: true, durationMs: 0 }, // Previously completed
    postGitHubComments: { success: false, durationMs: 0 },
  };

  try {
    // 1. Validate request
    const body = await request.json();
    const validatedRequest = validateSubmitReviewRequest(body);

    logger.info('Submitting approved review', {
      prUrl: validatedRequest.prUrl,
      commentsCount: validatedRequest.comments.length,
    });

    // 2. Parse PR URL
    const { owner, repo, number: prNumber } = parseGitHubPRUrl(validatedRequest.prUrl);
    const repository = `${owner}/${repo}`;

    // 3. Get PR details for head SHA
    const githubToken = process.env.GITHUB_TOKEN!;
    const githubClient = new GitHubClient(githubToken);
    const githubStart = Date.now();
    const pr = await githubClient.fetchPR(owner, repo, prNumber);
    steps.fetchGitHub = { success: true, durationMs: Date.now() - githubStart };

    // 4. Extract Jira ticket ID from PR title if not provided
    let jiraTicketId = validatedRequest.jiraTicketId;
    if (!jiraTicketId) {
      const extractedId = extractJiraTicketFromTitle(pr.title);
      if (extractedId) {
        jiraTicketId = extractedId;
        logger.info('Extracted Jira ticket ID from PR title', { jiraTicketId });
      }
    }

    // 5. Post review comments to GitHub
    const postCommentsStepStart = Date.now();
    try {
      await githubClient.postReviewComments(
        owner,
        repo,
        prNumber,
        pr.headSha,
        validatedRequest.comments
      );

      steps.postGitHubComments = {
        success: true,
        durationMs: Date.now() - postCommentsStepStart,
      };

      // 6. Post status comment to Jira (optional)
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
            validatedRequest.comments.length
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

      // 7. Save review to storage
      const reviewId = validatedRequest.reviewId || uuidv7();
      const storage = getStorage();
      
      let finalSteps = steps;
      let previousRetryCount = 0;
      let previousDuration = 0;

      if (validatedRequest.reviewId) {
        try {
           const previousReview = await storage.getReview(reviewId);
           if (previousReview) {
             finalSteps = {
               ...previousReview.metadata.steps,
               ...steps,
                // Preserve AI review stats if they exist
               aiReview: previousReview.metadata.steps.aiReview.success 
                  ? previousReview.metadata.steps.aiReview 
                  : steps.aiReview
             };
             previousRetryCount = previousReview.metadata.retryCount;
             // Calculate partial duration? Or just use new duration logic which is currently startTime based?
             // Since submit is a separate process, the "duration" metadata usually means "end-to-end" or "processing time".
             // Let's stick to current process duration for this record, or sum them up?
             // For simplicity, let's keep the submit process duration but acknowledge the steps.
           }
        } catch (e) {
          logger.warn(`Could not fetch previous review ${reviewId} for merging stats`, { error: e });
        }
      }

      const review: Review = {
        id: reviewId,
        timestamp: new Date().toISOString(),
        prUrl: validatedRequest.prUrl,
        prNumber,
        repository,
        prTitle: pr.title,
        jiraTicketId,
        modelId: validatedRequest.modelId,
        status: 'success',
        comments: validatedRequest.comments,
        metadata: {
          durationMs: Date.now() - startTime,
          retryCount: previousRetryCount, // currently 0 in submit route, but maybe preserve?
          steps: finalSteps,
        },
      };
      await storage.saveReview(review);

      logger.info('Successfully submitted approved review', {
        reviewId: review.id,
        prNumber,
        commentsCount: validatedRequest.comments.length,
        durationMs: review.metadata.durationMs,
      });

      return NextResponse.json({
        success: true,
        reviewId: review.id,
        commentsCount: validatedRequest.comments.length,
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
    logger.error('Failed to submit approved review', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

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
