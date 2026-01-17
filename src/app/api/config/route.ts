import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = {
      hasJiraConfig: !!(
        process.env.JIRA_BASE_URL &&
        process.env.JIRA_EMAIL &&
        process.env.JIRA_API_TOKEN
      ),
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    };

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}
