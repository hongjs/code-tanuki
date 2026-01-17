# Claude Code Guide for CodeOwl

> A comprehensive guide for developers using Claude Code to work with the CodeOwl codebase.

## Project Overview

CodeOwl is an AI-powered code review tool built with Next.js 16, TypeScript, and Material-UI. It integrates with GitHub, Jira, and Claude AI to automate code reviews on pull requests.

### Quick Facts

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.7
- **UI**: Material-UI (MUI) + Tailwind CSS
- **State**: React Hooks (no global state management)
- **API**: Next.js API Routes (serverless)
- **Storage**: JSON files with abstraction layer
- **Logging**: Winston
- **Validation**: Zod schemas

## Architecture

### High-Level Flow

```
User → Review Form → POST /api/review → Orchestrator
                                           ├── GitHub API (fetch PR)
                                           ├── Jira API (fetch ticket)
                                           ├── Claude API (AI review)
                                           ├── Preview (user approval)
                                           └── POST /api/review/submit
                                                 ├── GitHub API (post comments)
                                                 ├── Jira API (post comment)
                                                 └── Storage (save review)
```

### Directory Structure

```
src/
├── app/                          # Next.js 16 App Router
│   ├── layout.tsx               # Root layout with sidebar navigation
│   ├── page.tsx                 # Redirects to /review
│   ├── review/                  # Review page
│   │   └── page.tsx            # Main review form
│   ├── history/                 # History page
│   │   └── page.tsx            # Review history table
│   └── api/                     # API Routes (serverless functions)
│       ├── review/
│       │   ├── route.ts        # Main orchestrator (preview mode)
│       │   └── submit/
│       │       └── route.ts    # Submit approved review
│       ├── github/
│       │   └── pr/route.ts     # Fetch PR details
│       ├── jira/
│       │   ├── ticket/route.ts # Fetch Jira ticket
│       │   └── comment/route.ts # Post Jira comment
│       ├── history/route.ts    # Get review history
│       └── health/route.ts     # Health check endpoint
│
├── components/                   # React Components
│   ├── layout/
│   │   └── Sidebar.tsx         # Navigation sidebar
│   ├── review/
│   │   ├── ReviewForm.tsx      # Main review form
│   │   ├── ReviewProgress.tsx  # Progress tracker
│   │   ├── ReviewPreviewDialog.tsx # Preview dialog
│   │   └── ModelSelector.tsx   # AI model selector
│   └── history/
│       ├── HistoryTable.tsx    # MUI DataGrid table
│       └── HistoryFilters.tsx  # Filter controls
│
├── lib/                          # Business Logic Layer
│   ├── api/                     # External API Clients
│   │   ├── github.ts           # GitHub Octokit client
│   │   ├── jira.ts             # Jira REST API client
│   │   ├── claude.ts           # Anthropic SDK client
│   │   └── gemini.ts           # Google Gemini client (optional)
│   ├── storage/
│   │   ├── adapter.ts          # IStorageAdapter interface
│   │   └── json-storage.ts     # JSON file implementation
│   ├── logger/
│   │   └── winston.ts          # Winston logger config
│   ├── utils/
│   │   ├── env.ts              # Zod environment validation
│   │   ├── retry.ts            # Exponential backoff retry
│   │   ├── validation.ts       # Input validation helpers
│   │   └── jira-extractor.ts   # Extract Jira ID from PR title
│   └── constants/
│       ├── models.ts           # Available AI models
│       ├── prompts.ts          # AI prompt templates
│       └── regex.ts            # Regex patterns
│
└── types/                        # TypeScript Type Definitions
    ├── review.ts               # Review, ReviewComment types
    ├── github.ts               # GitHub API types
    ├── jira.ts                 # Jira API types
    ├── claude.ts               # Claude API types
    ├── ai.ts                   # Generic AI types
    └── errors.ts               # Custom error classes
```

## Key Files Explained

### API Route: `/api/review/route.ts`

This is the **main orchestrator** that coordinates the entire review process:

1. Validates input with Zod
2. Checks for duplicate reviews (last 5 minutes)
3. Fetches GitHub PR data
4. Fetches Jira ticket (if provided/extracted)
5. Sends to Claude AI for review
6. Returns preview or posts comments
7. Saves review to storage

**Important**: This endpoint supports `previewOnly: true` to show comments before posting.

### API Route: `/api/review/submit/route.ts`

Handles the **approval step** after preview:

1. Posts approved comments to GitHub PR
2. Posts summary to Jira ticket (if configured)
3. Saves final review to storage

### Component: `ReviewForm.tsx`

Main review form with:
- PR URL input (auto-fetches PR title)
- Jira ticket ID input (auto-extraction from PR title)
- Additional prompt input
- Model selector
- Progress tracker
- Preview dialog integration

**State Flow**:
```
idle → fetching-github → fetching-jira → ai-review → approval → posting-comments → success
```

### Client: `lib/api/claude.ts`

Claude AI client with:
- Streaming support (currently unused)
- Token counting
- Error handling
- Retry logic via `withRetry`

**Key Method**: `reviewPullRequest()`
- Takes PR diff, files, Jira context
- Returns structured review comments
- Uses prompt from `lib/constants/prompts.ts`

### Storage: `lib/storage/json-storage.ts`

JSON file-based storage implementing `IStorageAdapter`:

```typescript
interface IStorageAdapter {
  saveReview(review: ReviewRecord): Promise<void>;
  getReviews(): Promise<ReviewRecord[]>;
  getReviewById(id: string): Promise<ReviewRecord | null>;
}
```

**Files**:
- `data/reviews/{timestamp}-{prNumber}.json` - Individual reviews
- `data/reviews/all-reviews.json` - Aggregated index

### Validation: `lib/utils/env.ts`

Zod schema for environment validation:
- Runs at server startup
- Throws error if required variables missing
- Type-safe access via exported `env` object

```typescript
import { env } from '@/lib/utils/env';
const apiKey = env.ANTHROPIC_API_KEY; // Type-safe!
```

## Common Development Tasks

### Adding a New AI Model

1. **Update model list**: `src/lib/constants/models.ts`
   ```typescript
   export const ALL_AI_MODELS: AIModel[] = [
     // ... existing models
     {
       id: 'new-model-id',
       name: 'New Model Name',
       provider: 'anthropic' | 'google',
       description: '...',
       maxTokens: 4096,
     },
   ];
   ```

2. **Update client**: `src/lib/api/claude.ts` or `gemini.ts`
3. **Update types**: `src/types/ai.ts` if needed
4. **Test**: Review form should show new model

### Adding a New Review Step

1. **Update status type**: `src/types/review.ts`
   ```typescript
   export type ReviewStatus =
     | 'idle'
     | 'fetching-github'
     | 'your-new-step'
     | ...
   ```

2. **Update progress component**: `src/components/review/ReviewProgress.tsx`
   - Add new step to `steps` array
   - Add icon and description

3. **Update orchestrator**: `src/app/api/review/route.ts`
   - Add logic for new step
   - Update response to include new step status

### Modifying the AI Prompt

1. **Edit prompt**: `src/lib/constants/prompts.ts`
   ```typescript
   export const REVIEW_PROMPT = `
     Your updated instructions here...
   `;
   ```

2. **Test with real PR**: The prompt is injected in `lib/api/claude.ts`

### Adding Jira Custom Fields

1. **Update Jira types**: `src/types/jira.ts`
   ```typescript
   export interface JiraTicket {
     // ... existing fields
     customField?: string;
   }
   ```

2. **Update Jira client**: `src/lib/api/jira.ts`
   - Modify `fetchTicket()` to extract custom field
   - Map from Jira API response

3. **Update prompt**: Include custom field in `prompts.ts`

### Migrating to a Database

1. **Create adapter**: `src/lib/storage/postgres-storage.ts`
   ```typescript
   export class PostgresStorageAdapter implements IStorageAdapter {
     async saveReview(review: ReviewRecord): Promise<void> {
       // Your DB logic
     }
     // ... implement other methods
   }
   ```

2. **Update factory**: `src/lib/storage/adapter.ts` (if exists) or update imports
3. **Set env**: `STORAGE_TYPE=postgres`
4. **No changes needed** in API routes!

## Working with Claude Code

### Exploring the Codebase

Ask Claude Code to:
- "Show me how GitHub PR fetching works"
- "Explain the review orchestration flow"
- "Find all files related to Jira integration"
- "Show me where AI prompts are defined"

### Making Changes

When asking Claude Code to make changes:
- "Add error handling for rate limiting in GitHub client"
- "Update the UI to show estimated review time"
- "Add a new filter to the history page"
- "Implement dark mode toggle"

### Debugging

Useful prompts:
- "Why is the review stuck at 'fetching-jira' status?"
- "Debug the duplicate review detection logic"
- "Fix the type error in ReviewForm.tsx"
- "Show me the logs for failed reviews"

### Code Review

Ask Claude Code to:
- "Review my changes to the Claude client"
- "Check if my new component follows the existing patterns"
- "Suggest improvements for this API route"

## Coding Conventions

### File Naming

- **Components**: PascalCase (`ReviewForm.tsx`)
- **Utilities**: camelCase (`retry.ts`, `jira-extractor.ts`)
- **Types**: camelCase (`review.ts`, `github.ts`)
- **API Routes**: kebab-case folders, `route.ts` files

### Import Order

```typescript
// 1. External packages
import { useState } from 'react';
import { Button } from '@mui/material';

// 2. Internal absolute imports
import { ReviewStatus } from '@/types/review';
import { ClaudeClient } from '@/lib/api/claude';

// 3. Relative imports
import { ReviewProgress } from './ReviewProgress';
```

### Component Structure

```typescript
'use client'; // If using hooks

import { ... } from '...';

interface Props {
  // Props interface
}

export function ComponentName({ prop1, prop2 }: Props) {
  // State
  const [state, setState] = useState();

  // Effects
  useEffect(() => { ... }, []);

  // Handlers
  const handleAction = () => { ... };

  // Render
  return ( ... );
}
```

### API Route Structure

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger/winston';
import { z } from 'zod';

const requestSchema = z.object({
  // Schema definition
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const data = requestSchema.parse(body);

    // 2. Business logic
    const result = await doSomething(data);

    // 3. Return response
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error message', { error });
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

## Environment Variables

### Required

```env
ANTHROPIC_API_KEY=sk-ant-...    # Claude AI
GITHUB_TOKEN=ghp_...            # GitHub API
```

### Optional (Jira)

```env
JIRA_BASE_URL=https://company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=...
```

**Note**: If Jira variables are missing, Jira integration is silently skipped.

### Validation

All env vars are validated at startup via `src/lib/utils/env.ts` using Zod schemas.

## Testing

### Manual Testing

1. **Set up test environment**:
   ```bash
   cp .env.example .env
   # Fill in real API keys
   npm run dev
   ```

2. **Test review flow**:
   - Go to http://localhost:3000
   - Enter a real GitHub PR URL
   - Add Jira ticket ID (optional)
   - Click "Start Review"
   - Verify preview shows
   - Approve and verify comments posted

3. **Test history**:
   - Navigate to /history
   - Verify reviews appear
   - Test filters and search

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### "Cannot find module '@/...'"

This is a TypeScript path alias. Check `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Zod Validation Errors

Check the error output - Zod provides detailed field-level errors:

```typescript
try {
  const data = schema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log(error.flatten());
  }
}
```

### Winston Logging Not Working

Ensure `logs/` directory exists:

```bash
mkdir -p logs
```

### Storage Errors

Ensure data directory and initial file exist:

```bash
mkdir -p data/reviews
echo "[]" > data/reviews/all-reviews.json
```

## API Integration Details

### GitHub API (Octokit)

**Authentication**: Personal Access Token
**Endpoints Used**:
- `GET /repos/{owner}/{repo}/pulls/{number}` - PR details
- `GET /repos/{owner}/{repo}/pulls/{number}/files` - Changed files
- `POST /repos/{owner}/{repo}/pulls/{number}/comments` - Inline comments

**Rate Limits**: 5000 requests/hour (authenticated)

### Jira REST API

**Authentication**: Basic Auth (email + API token)
**Endpoints Used**:
- `GET /rest/api/3/issue/{issueKey}` - Ticket details
- `POST /rest/api/3/issue/{issueKey}/comment` - Post comment

**Note**: Uses Atlassian Document Format (ADF) for rich text

### Claude API (Anthropic)

**Authentication**: API key (X-API-Key header)
**Model**: Configurable (Opus 4, Sonnet 4, Haiku 4)
**Features Used**:
- Messages API (non-streaming)
- System prompts
- JSON mode (for structured output)

## Performance Considerations

### API Timeouts

All external API calls use `withRetry()` wrapper:
- Max 3 attempts (configurable)
- Exponential backoff
- 1s base delay, 10s max delay

### Large PRs

Claude has token limits:
- Opus 4: 200K input, 16K output
- Sonnet 4: 200K input, 16K output
- Haiku 4: 200K input, 8K output

For very large diffs, truncation may be needed (not currently implemented).

### Storage Performance

JSON storage is simple but not scalable:
- All reviews loaded into memory for `/api/history`
- No indexing or querying capabilities
- Consider database migration for >10K reviews

## Security Considerations

### API Keys

- Never commit `.env` file
- API keys are server-side only (not exposed to client)
- Use environment variables only

### Input Validation

- All user inputs validated with Zod schemas
- PR URLs validated with regex
- Sanitization for GitHub/Jira API calls

### Error Messages

- Generic errors shown to users
- Detailed errors logged server-side
- No sensitive data in client-facing errors

## Deployment

### Docker Production

```bash
docker-compose up -d
```

Includes:
- Health checks at `/api/health`
- Automatic restart on failure
- Volume-mounted persistence
- Production build optimization

### Environment

Ensure all environment variables set in production:
- Use secrets management (AWS Secrets Manager, etc.)
- Never expose API keys in client-side code
- Set `NODE_ENV=production`

## Additional Resources

### External Documentation

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Material-UI Components](https://mui.com/material-ui/all-components/)
- [Anthropic API Reference](https://docs.anthropic.com/en/api)
- [GitHub REST API](https://docs.github.com/rest)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

### Internal Documentation

- [README.md](./README.md) - Main project documentation
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup guide
- [UI_IMPROVEMENTS.md](./UI_IMPROVEMENTS.md) - UI/UX details

## Tips for Claude Code Users

1. **Ask for context**: "Explain how [feature] works in this codebase"
2. **Request specific files**: "Show me the GitHub client implementation"
3. **Get architectural guidance**: "What's the best way to add [feature]?"
4. **Debug with context**: "This error occurs when [scenario], help me debug"
5. **Code review**: "Review my changes to [file] for bugs and improvements"

## Common Questions

### Q: How do I add support for GitLab?

A: Create `src/lib/api/gitlab.ts` similar to `github.ts`, update types, and modify the orchestrator to support both platforms.

### Q: Can I use a different AI provider?

A: Yes! Implement a new client in `src/lib/api/`, add models to `constants/models.ts`, and update the review orchestrator to route to the correct provider.

### Q: How do I customize the review criteria?

A: Edit `src/lib/constants/prompts.ts` to modify what Claude looks for in code reviews.

### Q: Can I run this without Jira?

A: Yes! Jira is optional. If Jira env variables are not set, the Jira integration is automatically skipped.

---

**Happy coding with Claude Code!**

For questions or issues, check the main [README.md](./README.md) or open an issue on GitHub.
