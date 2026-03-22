import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const filePath = path.resolve(process.cwd(), 'docs/swagger.yaml');
  const content = fs.readFileSync(filePath, 'utf-8');
  return new NextResponse(content, {
    headers: { 'Content-Type': 'application/yaml' },
  });
}
