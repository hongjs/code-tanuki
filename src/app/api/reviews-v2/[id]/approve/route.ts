import { NextRequest, NextResponse } from 'next/server';
import { reviewV2Storage } from '@/lib/storage/review-v2-storage';
import { GitHubClient } from '@/lib/api/github';
import { logger } from '@/lib/logger/winston';
import { parseGitHubPRUrl } from '@/lib/utils/parsers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;
    const review = await reviewV2Storage.getById(reviewId);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.status === 'posted') {
      return NextResponse.json({ error: 'Review is already posted' }, { status: 400 });
    }

    const { owner, repo, number: prNumber } = parseGitHubPRUrl(review.prUrl);
    const githubToken = process.env.GITHUB_TOKEN!;
    const githubClient = new GitHubClient(githubToken);

    // Fetch PR to get latest head_sha
    const pr = await githubClient.fetchPR(owner, repo, prNumber);

    // Post comments to GitHub
    await githubClient.postReviewComments(
      owner,
      repo,
      prNumber,
      pr.headSha,
      review.comments
    );

    // Update status locally
    review.status = 'posted';
    await reviewV2Storage.save(review);
    
    logger.info('V2 Review comments successfully posted to GitHub', { reviewId, prNumber });

    return NextResponse.json({ success: true, message: 'Review posted to GitHub successfully' });
  } catch (error: any) {
    logger.error('Failed to post review-v2 comments to GitHub', { id: params.id, error: error.message });
    return NextResponse.json({ error: error.message || 'Failed to post review comments' }, { status: 500 });
  }
}
