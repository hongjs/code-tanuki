import { NextRequest, NextResponse } from 'next/server';
import { reviewV2Storage } from '@/lib/storage/review-v2-storage';
import { logger } from '@/lib/logger/winston';
import { v7 as uuidv7 } from 'uuid';
import { ReviewV2Detail } from '@/types/review-v2';

export async function GET(request: NextRequest) {
  try {
    const reviews = await reviewV2Storage.getAll();
    return NextResponse.json(reviews);
  } catch (error: any) {
    logger.error('Failed to get reviews-v2', { error: error.message });
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const review: ReviewV2Detail = {
      ...body,
      id: body.id ?? uuidv7(),
      timestamp: body.timestamp ?? new Date().toISOString(),
      status: body.status ?? 'pending',
      comments: body.comments ?? [],
    };
    await reviewV2Storage.save(review);
    logger.info('Created review-v2', { id: review.id });
    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    logger.error('Failed to create review-v2', { error: error.message });
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
