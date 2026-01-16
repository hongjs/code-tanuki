import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/api/github';
import { parseGitHubPRUrl } from '@/lib/utils/parsers';
import { logger } from '@/lib/logger/winston';
import { ValidationError } from '@/types/errors';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const { owner, repo, number } = parseGitHubPRUrl(url);

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      logger.error('GITHUB_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const githubClient = new GitHubClient(githubToken);
    const pr = await githubClient.fetchPR(owner, repo, number);

    return NextResponse.json(pr);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    logger.error('Failed to fetch GitHub PR', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to fetch GitHub PR' },
      { status: 500 }
    );
  }
}
