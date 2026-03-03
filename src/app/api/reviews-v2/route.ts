import { NextRequest, NextResponse } from 'next/server';
import { reviewV2Storage } from '@/lib/storage/review-v2-storage';
import { logger } from '@/lib/logger/winston';

export async function GET(request: NextRequest) {
  try {
    const reviews = await reviewV2Storage.getAll();
    return NextResponse.json(reviews);
  } catch (error: any) {
    logger.error('Failed to get reviews-v2', { error: error.message });
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
