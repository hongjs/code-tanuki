import { NextRequest, NextResponse } from 'next/server';
import { reviewV2Storage } from '@/lib/storage/review-v2-storage';
import { logger } from '@/lib/logger/winston';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reviewId } = await params;
  try {
    const review = await reviewV2Storage.getById(reviewId);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error: any) {
    logger.error('Failed to get review-v2 detail', { id: reviewId, error: error.message });
    return NextResponse.json({ error: 'Failed to fetch review detail' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reviewId } = await params;
  try {
    const body = await request.json();
    const review = await reviewV2Storage.getById(reviewId);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (body.comments) {
      review.comments = body.comments;
      await reviewV2Storage.save(review);
    }

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    logger.error('Failed to update review-v2', { id: reviewId, error: error.message });
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}
