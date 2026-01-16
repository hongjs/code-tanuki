import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { ReviewFilters } from '@/types/storage';
import { logger } from '@/lib/logger/winston';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: ReviewFilters = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as 'success' | 'error') || undefined,
      model: searchParams.get('model') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }

    const storage = getStorage();
    const result = await storage.getAllReviews(filters);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to fetch review history', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({ error: 'Failed to fetch review history' }, { status: 500 });
  }
}
