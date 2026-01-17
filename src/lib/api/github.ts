import { Octokit } from '@octokit/rest';
import { GitHubPR, GitHubReviewComment } from '@/types/github';
import { GitHubAPIError } from '@/types/errors';
import { ReviewComment } from '@/types/review';
import { logger } from '../logger/winston';
import { withRetry } from '../utils/retry';

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async fetchPR(owner: string, repo: string, pull_number: number): Promise<GitHubPR> {
    return withRetry(
      async () => {
        try {
          logger.info(`Fetching PR data from GitHub`, { owner, repo, pull_number });

          // Fetch PR details
          const { data: pr } = await this.octokit.pulls.get({
            owner,
            repo,
            pull_number,
          });

          // Fetch PR files and diff
          const { data: files } = await this.octokit.pulls.listFiles({
            owner,
            repo,
            pull_number,
          });

          // Read .aiignore from local project root
          let ignorePatterns: string[] = [];
          try {
            const fs = await import('fs');
            const path = await import('path');
            const ignorePath = path.join(process.cwd(), '.aiignore');
            if (fs.existsSync(ignorePath)) {
              const content = fs.readFileSync(ignorePath, 'utf-8');
              ignorePatterns = content
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith('#'));
              logger.info(`Loaded .aiignore patterns`, { count: ignorePatterns.length });
            }
          } catch (err) {
            logger.warn('Failed to load .aiignore', { error: err });
          }

          // Simple glob-like matcher function
          const matchesPattern = (filename: string, pattern: string): boolean => {
            if (pattern.startsWith('*')) {
              return filename.endsWith(pattern.slice(1));
            }
            if (pattern.endsWith('/')) {
              return filename.startsWith(pattern) || filename.includes('/' + pattern);
            }
            if (pattern.includes('*')) {
              const parts = pattern.split('*');
              return filename.startsWith(parts[0]) && filename.endsWith(parts[1]);
            }
            return filename === pattern || filename.split('/').pop() === pattern;
          };

          // Filter files
          const filteredFiles = files.filter((file) => {
            const isIgnored = ignorePatterns.some((pattern) => 
              matchesPattern(file.filename, pattern)
            );
            if (isIgnored) {
              logger.debug(`Ignoring file from review`, { file: file.filename });
            }
            return !isIgnored;
          });

          // Build diff from files
          let diff = '';
          for (const file of filteredFiles) {
            if (file.patch) {
              diff += `diff --git a/${file.filename} b/${file.filename}\n`;
              diff += `--- a/${file.filename}\n`;
              diff += `+++ b/${file.filename}\n`;
              diff += file.patch + '\n\n';
            }
          }

          const result: GitHubPR = {
            number: pr.number,
            title: pr.title,
            body: pr.body || '',
            diff,
            repository: {
              owner,
              name: repo,
            },
            headSha: pr.head.sha,
            state: pr.state as 'open' | 'closed',
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
          };

          logger.info(`Successfully fetched PR data`, {
            prNumber: pr.number,
            filesChanged: files.length,
          });

          return result;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to fetch PR from GitHub`, {
            owner,
            repo,
            pull_number,
            error: message,
          });
          throw new GitHubAPIError(`Failed to fetch PR: ${message}`, {
            owner,
            repo,
            pull_number,
          });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }

  async postReviewComments(
    owner: string,
    repo: string,
    pull_number: number,
    commit_id: string,
    comments: ReviewComment[]
  ): Promise<void> {
    return withRetry(
      async () => {
        try {
          logger.info(`Posting review comments to GitHub`, {
            owner,
            repo,
            pull_number,
            commentsCount: comments.length,
          });

          // Format comments with severity badges
          const formattedComments: GitHubReviewComment[] = comments.map((comment) => {
            const severityEmoji = {
              critical: '🚨',
              warning: '⚠️',
              suggestion: '💡',
            };

            const badge = severityEmoji[comment.severity];
            const body = `${badge} **${comment.severity.toUpperCase()}**\n\n${comment.body}`;

            return {
              path: comment.path,
              line: comment.line,
              body,
            };
          });

          // Post review with inline comments
          await this.octokit.pulls.createReview({
            owner,
            repo,
            pull_number,
            commit_id,
            event: 'COMMENT',
            comments: formattedComments,
          });

          logger.info(`Successfully posted review comments to GitHub`, {
            prNumber: pull_number,
            commentsCount: comments.length,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to post review comments to GitHub`, {
            owner,
            repo,
            pull_number,
            error: message,
          });
          throw new GitHubAPIError(`Failed to post comments: ${message}`, {
            owner,
            repo,
            pull_number,
          });
        }
      },
      {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
        baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000'),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '10000'),
      }
    );
  }
}
