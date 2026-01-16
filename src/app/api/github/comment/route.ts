import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/api/github';
import { logger } from '@/lib/logger/winston';
import { ReviewComment } from '@/types/review';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, prNumber, headSha, comments } = body as {
      owner: string;
      repo: string;
      prNumber: number;
      headSha: string;
      comments: ReviewComment[];
    };

    if (!owner || !repo || !prNumber || !headSha || !comments) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      logger.error('GITHUB_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const githubClient = new GitHubClient(githubToken);
    await githubClient.postReviewComments(owner, repo, prNumber, headSha, comments);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to post GitHub comments', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: 'Failed to post GitHub comments' }, { status: 500 });
  }
}
