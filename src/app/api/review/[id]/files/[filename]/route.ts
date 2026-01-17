import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id, filename } = await params;

    // Security check: filename should be just a filename, no slashes
    if (filename.includes('/') || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Allowed files (optional check, or just allow any in the folder)
    // For now, let's allow accessing any file in that folder since UUID is hard to guess
    
    const filePath = path.join(process.cwd(), 'data/reviews/data', id, filename);

    try {
      await fs.access(filePath);
    } catch {
       return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = await fs.readFile(filePath, 'utf-8');

    // Determine content type based on file extension
    let contentType = 'application/json';
    if (filename.endsWith('.txt')) {
      contentType = 'text/plain';
    } else if (filename.endsWith('.json')) {
      contentType = 'application/json';
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Failed to download artifact:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
