import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { env } from '@/lib/utils/env';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await axios.get(
      `${env.JIRA_BASE_URL}/rest/api/3/attachment/content/${id}`,
      {
        auth: {
          username: env.JIRA_EMAIL,
          password: env.JIRA_API_TOKEN,
        },
        responseType: 'arraybuffer',
      }
    );

    const contentType = response.headers['content-type'] || 'application/octet-stream';

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('Failed to proxy attachment:', error.message);
    return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
  }
}
