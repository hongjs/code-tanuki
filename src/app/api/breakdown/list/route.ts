import { NextRequest, NextResponse } from 'next/server';
import { getBreakdownStorage } from '@/lib/storage';
import { logger } from '@/lib/logger/winston';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const storage = getBreakdownStorage();
    let list = await storage.getList();

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter by search
    if (search) {
      const lower = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.jiraTicketIds.some((id) => id.toLowerCase().includes(lower)) ||
          e.jiraSummary.toLowerCase().includes(lower)
      );
    }

    const total = list.length;
    const startIdx = (page - 1) * limit;
    const items = list.slice(startIdx, startIdx + limit);

    return NextResponse.json({ items, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to list breakdowns', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
