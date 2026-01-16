import { NextRequest, NextResponse } from 'next/server';
import { ClaudeClient } from '@/lib/api/claude';
import { ClaudeReviewRequest } from '@/types/claude';
import { logger } from '@/lib/logger/winston';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClaudeReviewRequest;

    if (!body.diff || !body.prTitle || !body.modelId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      logger.error('ANTHROPIC_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 });
    }

    const claudeClient = new ClaudeClient(anthropicApiKey);
    const response = await claudeClient.reviewPR(body);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get Claude review', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: 'Failed to get AI review' }, { status: 500 });
  }
}
