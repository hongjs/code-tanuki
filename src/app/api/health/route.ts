import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

export async function GET() {
  try {
    const storage = getStorage();
    const isHealthy = await storage.healthCheck();

    if (!isHealthy) {
      return NextResponse.json(
        { status: 'unhealthy', error: 'Storage not accessible' },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: 'healthy' });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
