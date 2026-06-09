# Claude Code Guide for Code-Tanuki

> A comprehensive guide for developers using Claude Code to work with the Code-Tanuki codebase.

## Gemini CLI Delegation Rule

**IMPORTANT**: Whenever you need to handle large-input tasks, delegate them to Gemini CLI via the `mcp__gemini-cli__ask-gemini` MCP tool instead of processing directly. This applies to:

- **Reading/exploring codebases** — e.g., "อธิบาย codebase นี้", "ไฟล์นี้ทำอะไร", "หา pattern ใน code"
- **Analyzing images** — screenshots, diagrams, UI mockups, any visual content
- **Reading large text/documents** — long logs, large JSON, markdown docs, API specs
- **Summarizing or Q&A on large content** — e.g., summarize a file, explain a long config
- **Simple tasks with large input** — any task where the main effort is reading/processing a lot of input

**How to delegate:**
```
mcp__gemini-cli__ask-gemini(prompt: "@path/to/file <your question>")
```

Use `@` syntax to include files directly in the prompt. Gemini has a large context window and is optimized for these tasks.

## Project Overview

Code-Tanuki is an AI-powered code review and Jira assistant built with Next.js 16, TypeScript, and Material-UI. It integrates with GitHub, Jira, Claude AI, and Google Gemini to automate code reviews on pull requests, and provides a local Jira ticket management system.

### Quick Facts

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.7
- **UI**: Material-UI (MUI v7) + Tailwind CSS v4
- **State**: React Hooks (no global state management)
- **API**: Next.js API Routes (serverless)
- **Storage**: JSON files with abstraction layer
- **Logging**: Winston
- **Validation**: Zod schemas
- **MCP Server**: Streamable HTTP transport (`mcp/index.ts`), port 3001 (local) / 8083 (Docker)
- **OpenAPI**: Zod-to-OpenAPI, spec at `docs/swagger.yaml`, UI at `/swagger`

## Architecture

### High-Level Flow

**V2 Review (Current):**
```
User → /code-review-v2 → POST /api/reviews-v2
                              ├── GitHub API (fetch PR + diff)
                              ├── Jira API (fetch ticket + attachments)
                              ├── Gemini Vision (analyze attachment images)
                              ├── Claude/Gemini API (AI review)
                              └── Storage (save to data/reviews-v2/)

User → /code-review-v2/[id] → Diff viewer with inline editable comments
                             → POST /api/reviews-v2/[id]/approve
                                   ├── GitHub API (post inline comments)
                                   ├── Jira API (post summary comment)
                                   └── Storage (update record)
```

**V1 Review (Legacy):**
```
User → /review → POST /api/review
                      ├── GitHub API (fetch PR)
                      ├── Jira API (fetch ticket)
                      ├── Claude/Gemini API (AI review)
                      └── Preview dialog → POST /api/review/submit
                                               ├── GitHub API (post comments)
                                               ├── Jira API (post comment)
                                               └── Storage (save to data/reviews/)
```

### Directory Structure

```
src/
├── app/                              # Next.js 16 App Router
│   ├── layout.tsx                   # Root layout with sidebar navigation
│   ├── providers.tsx                # MUI theme & emotion cache providers
│   ├── page.tsx                     # Redirects to /code-review-v2
│   ├── code-review-v2/              # V2 Review (current)
│   │   ├── page.tsx                 # Review list page
│   │   └── [id]/
│   │       └── page.tsx             # Review detail with diff viewer
│   ├── review/                      # V1 Review (legacy)
│   │   └── page.tsx                 # Main review form
│   ├── history/                     # Review history
│   │   └── page.tsx                 # Review history table with filters
│   ├── tickets/                     # Jira Ticket Manager
│   │   ├── page.tsx                 # Epic/Story/List views
│   │   └── [localId]/
│   │       └── page.tsx             # Ticket detail page
│   ├── how-it-works/                # Documentation page
│   │   └── page.tsx
│   ├── swagger/                     # Swagger UI page
│   │   ├── page.tsx                 # Renders SwaggerUIComponent
│   │   └── SwaggerUIComponent.tsx   # Client component wrapping swagger-ui-react
│   └── api/                         # API Routes (serverless functions)
│       ├── health/route.ts          # Health check endpoint
│       ├── config/route.ts          # App config (has Jira/AI keys, etc.)
│       ├── claude/route.ts          # Direct Claude API integration
│       ├── github/
│       │   ├── pr/route.ts          # Fetch GitHub PR details
│       │   └── comment/route.ts     # Post comment to GitHub PR
│       ├── jira/
│       │   ├── ticket/route.ts      # Fetch Jira ticket
│       │   ├── comment/route.ts     # Post Jira comment
│       │   └── attachments/[id]/route.ts  # Download Jira attachment
│       ├── review/
│       │   ├── route.ts             # V1: Orchestrator (preview mode)
│       │   ├── submit/route.ts      # V1: Submit approved review
│       │   └── [id]/files/[filename]/route.ts  # Serve review file artifacts
│       ├── reviews-v2/
│       │   ├── route.ts             # V2: Create / list reviews
│       │   └── [id]/
│       │       ├── route.ts         # V2: Get review detail
│       │       └── approve/route.ts # V2: Approve & post to GitHub/Jira
│       ├── history/route.ts         # Get V1 review history
│       └── tickets/
│           ├── route.ts             # List / create local tickets
│           ├── sync-new/route.ts    # Sync new ticket from Jira ID
│           ├── bulk-jira/route.ts   # Bulk Jira sync actions
│           ├── swagger/route.ts     # Serve docs/swagger.yaml as JSON
│           └── [localId]/
│               ├── route.ts         # Get / update / delete ticket
│               └── jira/route.ts    # Sync single ticket with Jira
│
├── components/                       # React Components
│   ├── layout/
│   │   ├── Header.tsx               # Page header
│   │   ├── MainLayout.tsx           # Main content wrapper
│   │   └── Sidebar.tsx              # Navigation sidebar
│   ├── review/                       # V1 review components
│   │   ├── ReviewForm.tsx           # Main review form
│   │   ├── ReviewProgress.tsx       # Progress tracker
│   │   ├── ReviewPreviewDialog.tsx  # Preview & approval dialog
│   │   └── ModelSelector.tsx        # AI model dropdown
│   ├── review-v2/                    # V2 review components
│   │   ├── CodeReviewV2List.tsx     # Review list page
│   │   └── CodeReviewV2Detail.tsx   # Diff viewer with inline comments
│   ├── history/
│   │   ├── HistoryTable.tsx         # MUI DataGrid table
│   │   └── HistoryFilters.tsx       # Filter controls
│   └── tickets/
│       ├── TicketsManager.tsx       # Main ticket UI container
│       ├── EpicGroupView.tsx        # Hierarchical epic display
│       ├── StoryView.tsx            # Board-style story display
│       ├── TicketDetailDialog.tsx   # Ticket editor dialog
│       ├── TicketFilters.tsx        # Search & filter controls
│       └── ticketColors.ts          # Ticket status color constants
│
├── lib/                              # Business Logic Layer
│   ├── api/                         # External API Clients
│   │   ├── claude.ts               # Anthropic SDK client
│   │   ├── gemini.ts               # Google Gemini client
│   │   ├── gemini-vision.ts        # Gemini Vision for image analysis
│   │   ├── github.ts               # GitHub Octokit client
│   │   └── jira.ts                 # Jira REST API client
│   ├── storage/
│   │   ├── index.ts                # Storage factory / exports
│   │   ├── json-storage.ts         # V1 JSON file storage adapter
│   │   ├── review-v2-storage.ts    # V2 review storage
│   │   └── ticket-storage.ts       # Local ticket storage
│   ├── logger/
│   │   └── winston.ts              # Winston logger configuration
│   ├── utils/
│   │   ├── env.ts                  # Zod environment validation
│   │   ├── retry.ts                # Exponential backoff retry
│   │   ├── validation.ts           # Input validation helpers
│   │   ├── diff.ts                 # Diff parsing utilities
│   │   ├── date.ts                 # Date formatting utilities
│   │   ├── image-extractor.ts      # Extract images from Jira attachments
│   │   ├── knowledge.ts            # Knowledge base loader (data/knowledge.md)
│   │   └── parsers.ts              # Parser utilities
│   └── constants/
│       ├── models.ts               # Available AI models
│       ├── prompts.ts              # AI prompt templates
│       └── regex.ts                # Regex patterns
│
└── types/                            # TypeScript Type Definitions
    ├── review.ts                   # V1 Review, ReviewComment types
    ├── review-v2.ts                # V2 ReviewV2Status, ReviewV2Detail types
    ├── ai.ts                       # AIProvider, AIModel, AIReviewRequest/Response
    ├── claude.ts                   # Claude-specific types
    ├── github.ts                   # GitHub API types
    ├── jira.ts                     # JiraTicket, JiraComment, JiraAttachment types
    ├── ticket.ts                   # LocalTicket, TicketIndexEntry types
    ├── storage.ts                  # IStorageAdapter, ReviewFilters, PaginatedReviews
    └── errors.ts                   # Custom error classes
```

### Data Directory Structure

```
data/
├── reviews/                         # V1 review records
│   ├── all-reviews.json            # Index of all V1 reviews
│   └── data/
│       └── [uuid]/
│           ├── item.json           # Review metadata
│           ├── pr.json             # GitHub PR data snapshot
│           ├── jira.json           # Jira ticket data (if any)
│           ├── res-ai.json         # Raw AI response
│           ├── prompt.txt          # Rendered review prompt
│           ├── system-prompt.txt   # System prompt used
│           ├── req-prompt.json     # Request details
│           ├── image-descriptions.json  # Vision analysis results
│           └── images/             # Cached Jira attachment images
├── reviews-v2/                      # V2 review records
│   ├── all-reviews.json            # Index of all V2 reviews
│   └── data/
│       └── [uuid]/
│           └── item.json           # V2 review data
├── jira-tickets/                    # Local Jira ticket cache
│   ├── tickets.json                # Index of local tickets
│   └── data/
│       └── [uuid]/
│           ├── item.json           # Ticket details
│           └── attachments/        # Cached attachments
└── knowledge.md                     # Domain knowledge injected into AI context
```

## Key Files Explained

### API Route: `/api/reviews-v2/route.ts` (V2 Orchestrator)

Creates a new V2 review:

1. Validates input with Zod
2. Fetches GitHub PR data and diff
3. Fetches Jira ticket and attachments
4. Uses Gemini Vision to analyze attachment images
5. Loads `data/knowledge.md` for domain context
6. Sends all context to Claude/Gemini for review
7. Saves result to `data/reviews-v2/`

### API Route: `/api/reviews-v2/[id]/approve/route.ts`

Posts the approved V2 review:

1. Reads saved V2 review from storage
2. Posts inline comments to GitHub PR
3. Posts summary comment to Jira ticket (if configured)
4. Updates review record status

### API Route: `/api/review/route.ts` (V1 Orchestrator — Legacy)

1. Validates input with Zod
2. Checks for duplicate reviews (configurable window)
3. Fetches GitHub PR data
4. Fetches Jira ticket (if provided/extracted)
5. Sends to Claude/Gemini for review
6. Returns preview for user approval

### Component: `review-v2/CodeReviewV2Detail.tsx`

V2 diff viewer with:

- GitHub-like side-by-side or unified diff rendering
- Inline AI comments displayed below referenced lines
- Code suggestion blocks with `+`/`-` formatting
- Editable comment boxes before posting

### Component: `review/ReviewForm.tsx` (V1 — Legacy)

**State Flow**:
```
idle → fetching-github → fetching-jira → ai-review → approval → posting-comments → success
```

### AI Clients: `lib/api/claude.ts` and `lib/api/gemini.ts`

Both implement `reviewPullRequest()`:
- Takes PR diff, files, Jira context, knowledge base, and image descriptions
- Returns structured review comments
- Uses prompts from `lib/constants/prompts.ts`
- Wrapped with retry logic via `withRetry`

`lib/api/gemini-vision.ts` — analyzes Jira attachment images and returns text descriptions for inclusion in the review context.

### Storage: `lib/storage/`

| File | Purpose |
|------|---------|
| `index.ts` | Factory and export point |
| `json-storage.ts` | V1 review storage (data/reviews/) |
| `review-v2-storage.ts` | V2 review storage (data/reviews-v2/) |
| `ticket-storage.ts` | Local ticket storage (data/jira-tickets/) |

All storage implementations use the `IStorageAdapter` interface from `src/types/storage.ts`.

### Knowledge Base: `data/knowledge.md`

A Markdown file with domain-specific context (business rules, tech conventions, etc.) loaded by `lib/utils/knowledge.ts` and injected into every AI review prompt for more informed, project-aware feedback.

### Validation: `lib/utils/env.ts`

Zod schema validates all environment variables at server startup:

```typescript
import { env } from '@/lib/utils/env';
const apiKey = env.ANTHROPIC_API_KEY; // Type-safe!
```

### MCP Server: `mcp/index.ts`

A standalone [Model Context Protocol](https://modelcontextprotocol.io/) server over **Streamable HTTP** transport. Each incoming POST to `/mcp` initialises a new session; subsequent requests reuse the session via `mcp-session-id` header.

**Registered tools:**

_Ticket tools_ (backed by `/api/tickets/*`):

| Tool | Endpoint |
|------|----------|
| `list_tickets` | `GET /api/tickets` |
| `get_ticket` | `GET /api/tickets/:localId` |
| `create_ticket` | `POST /api/tickets` |
| `update_ticket` | `PUT /api/tickets/:localId` |
| `delete_ticket` | `DELETE /api/tickets/:localId` |
| `sync_ticket_from_jira` | `POST /api/tickets/sync-new` |
| `push_ticket_to_jira` | `POST /api/tickets/:localId/jira` |
| `update_ticket_on_jira` | `PATCH /api/tickets/:localId/jira` |
| `refresh_ticket_from_jira` | `GET /api/tickets/:localId/jira` |

_Review tools_ (backed by `/api/reviews-v2/*`):

| Tool | Endpoint |
|------|----------|
| `list_reviews` | `GET /api/reviews-v2` |
| `get_review` | `GET /api/reviews-v2/:id` |
| `save_review` | `POST /api/reviews-v2` |

_Knowledge tools_ (direct filesystem via MCP server):

| Tool | Description |
|------|-------------|
| `read_knowledge` | Read `data/knowledge.md` |
| `update_knowledge` | Overwrite `data/knowledge.md` with new content |

_Log tools_ (direct filesystem via MCP server):

| Tool | Description |
|------|-------------|
| `list_log_files` | List available log files with sizes and timestamps |
| `read_log` | Read last N lines of `combined.log` or `error.log`, filterable by level/search |

**Environment variables**:
- `MCP_PORT` — HTTP port (default `3001`)
- `CODE_TANUKI_BASE_URL` — base URL of the web app (default `http://localhost:8082`)

**Running locally**: `yarn mcp`
**Docker**: starts automatically on port `3083` via `docker-entrypoint.sh`

**Add to Claude Code**:
```bash
claude mcp add --transport http code-tanuki-tickets http://localhost:3001/mcp
```

### OpenAPI / Swagger

**Spec file**: `docs/swagger.yaml` — generated from Zod schemas in `src/lib/schemas/` using `@asteasolutions/zod-to-openapi`.

Schema files:
- `ticket-schemas.ts` — Ticket API schemas
- `review-v2-schemas.ts` — Reviews V2 API schemas

**Regenerate**:
```bash
yarn swagger   # runs scripts/gen-swagger.ts → writes docs/swagger.yaml
```

**Serve**: `GET /api/swagger` reads `docs/swagger.yaml` and returns it as JSON for the Swagger UI.

**Swagger UI**: available at `http://localhost:3000/swagger` (rendered by `src/app/swagger/SwaggerUIComponent.tsx`).

**Covered endpoints**: `/api/tickets/*` and `/api/reviews-v2/*`.

When adding new API endpoints with Zod request/response schemas, register them in `scripts/gen-swagger.ts` and re-run `yarn swagger` to keep the spec in sync.

## Common Development Tasks

### Adding a New AI Model

1. **Update model list**: `src/lib/constants/models.ts`

   ```typescript
   export const ALL_AI_MODELS: AIModel[] = [
     {
       id: 'new-model-id',
       name: 'New Model Name',
       provider: 'anthropic' | 'google',
       description: '...',
       maxTokens: 8192,
     },
   ];
   ```

2. **Update client**: `src/lib/api/claude.ts` or `gemini.ts`
3. **Update types** if needed: `src/types/ai.ts`

### Adding a New V2 Review Step

1. **Update status type**: `src/types/review-v2.ts`
2. **Update V2 orchestrator**: `src/app/api/reviews-v2/route.ts`
3. **Update V2 detail component**: `src/components/review-v2/CodeReviewV2Detail.tsx`

### Modifying the AI Prompt

Edit `src/lib/constants/prompts.ts`. The prompt template receives:
- PR diff and file list
- Jira ticket summary, description, and acceptance criteria
- Knowledge base content (`data/knowledge.md`)
- Image descriptions from Jira attachments

### Jira Ticket Standards (Local Data)

When creating or generating JSON tickets in `/data/jira-tickets/`, always sync both:

1. `data/jira-tickets/tickets.json` — index/summary list
2. `data/jira-tickets/data/{localId}/item.json` — full ticket payload

**UUIDv7 Standard**: The `localId` property **MUST** use UUIDv7 (time-based prefix for chronological sorting). Never use random UUIDv4.

### Adding a New Jira Custom Field

1. **Update Jira types**: `src/types/jira.ts`
2. **Update Jira client**: `src/lib/api/jira.ts` — extract field in `fetchTicket()`
3. **Update prompt**: Include field in `src/lib/constants/prompts.ts`

### Adding a New MCP Tool

1. Create or update a tool file in `mcp/tools/` (e.g. `mcp/tools/reviews.ts`)
2. Export a `register*Tools(server: McpServer)` function
3. Register tools with `server.registerTool(name, { description, inputSchema }, handler)`
4. Import and call the register function in `mcp/index.ts` inside `createMcpServer()`
5. Handlers should use `apiFetch()` for HTTP API-backed tools, or `fs/promises` for direct file access
6. Restart `yarn mcp` — no rebuild needed

> **MCP-only data rule**: All workflow/skill data access goes through MCP tools. Never read/write files directly in workflows. See `.claude/skills/code-review/SKILL.md`.

### Adding a New API Endpoint to the OpenAPI Spec

1. Define request/response Zod schemas in `src/lib/schemas/`
2. Register the path in `scripts/gen-swagger.ts` using `registry.registerPath()`
3. Run `yarn swagger` to regenerate `docs/swagger.yaml`
4. The Swagger UI at `/swagger` will reflect the update automatically

### Migrating to a Database

1. **Create adapter**: `src/lib/storage/postgres-storage.ts` implementing `IStorageAdapter`
2. **Register it**: `src/lib/storage/index.ts`
3. **Set env**: `STORAGE_TYPE=postgres`
4. API routes need no changes — they use the adapter interface.

## Coding Conventions

### File Naming

- **Components**: PascalCase (`ReviewForm.tsx`)
- **Utilities**: camelCase (`retry.ts`, `diff.ts`)
- **Types**: camelCase (`review.ts`, `ticket.ts`)
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

interface Props {
  prop1: string;
}

export function ComponentName({ prop1 }: Props) {
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

const requestSchema = z.object({ ... });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    const result = await doSomething(data);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error message', { error });
    return NextResponse.json({ error: 'Error message' }, { status: 500 });
  }
}
```

## Environment Variables

### Required

```env
GITHUB_TOKEN=ghp_...

# At least one AI provider:
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

### Optional — Jira Integration

```env
JIRA_BASE_URL=https://company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=...
JIRA_PROJECT_KEY=PROJ
JIRA_STORY_POINTS_FIELD=customfield_10016
JIRA_EPIC_LINK_FIELD=customfield_10014
```

> If Jira variables are missing, Jira integration is silently skipped.

### Optional — AI Configuration

```env
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.3
CLAUDE_MODEL_DEFAULT=claude-opus-4-6
CLAUDE_MAX_TOKENS=8192
CLAUDE_TEMPERATURE=0.3
```

### Optional — Storage & Logging

```env
DATA_DIR=./data/reviews
REVIEW_V2_DATA_DIR=./data/reviews-v2
TICKET_DATA_DIR=./data/jira-tickets
LOG_DIR=./logs
LOG_LEVEL=info
```

### Optional — Retry Configuration

```env
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY_MS=1000
RETRY_MAX_DELAY_MS=10000
DUPLICATE_CHECK_MINUTES=5
```

## Testing

### Manual Testing

```bash
cp .env.example .env
# Fill in API keys
npm run dev
```

**Test V2 Review flow:**
1. Go to http://localhost:3000/code-review-v2
2. Enter a real GitHub PR URL and (optionally) a Jira ticket ID
3. Click **Generate Review**
4. Open the review and check inline comments in the diff viewer
5. Click **Approve** and verify comments are posted to GitHub

**Test Ticket Manager:**
1. Go to http://localhost:3000/tickets
2. Sync a ticket by Jira ID
3. Edit offline, then Publish back to Jira

**Test MCP Server:**
1. Run `yarn mcp` in a separate terminal (requires `yarn dev` to be running)
2. Connect with `claude mcp add --transport http code-tanuki-tickets http://localhost:3001/mcp`
3. Ask Claude to `list_tickets` or `create_ticket` to verify tools work

**Test Swagger UI:**
1. Run `yarn swagger` to regenerate `docs/swagger.yaml`
2. Go to http://localhost:3000/swagger to verify the UI renders

### Type Checking

```bash
yarn type-check
```

### Linting

```bash
yarn lint
```

## Troubleshooting

### Gemini "Failed to parse JSON" Error

**Cause**: Response truncation on Gemini free tier.

**Fix**:
1. Reduce max tokens in `.env`: `GEMINI_MAX_TOKENS=2048`
2. The salvage logic in `src/lib/api/gemini.ts` auto-closes incomplete JSON
3. Switch to Claude for large PRs: `ANTHROPIC_API_KEY=sk-ant-...`
4. Debug: check `logs/combined.log` for the raw truncated response

### Storage Setup Errors

```bash
mkdir -p data/reviews data/reviews-v2 data/jira-tickets logs
echo "[]" > data/reviews/all-reviews.json
echo "[]" > data/reviews-v2/all-reviews.json
echo "[]" > data/jira-tickets/tickets.json
```

### "Cannot find module '@/...'"

TypeScript path alias issue. Check `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### Winston Logging Not Working

```bash
mkdir -p logs
```

## API Integration Details

### GitHub API (Octokit)

- `GET /repos/{owner}/{repo}/pulls/{number}` — PR details
- `GET /repos/{owner}/{repo}/pulls/{number}/files` — Changed files with diffs
- `POST /repos/{owner}/{repo}/pulls/{number}/comments` — Inline review comments

Rate limit: 5000 requests/hour (authenticated)

### Jira REST API

- `GET /rest/api/3/issue/{issueKey}` — Ticket details
- `GET /rest/api/3/issue/{issueKey}/attachments` — Attachments list
- `POST /rest/api/3/issue/{issueKey}/comment` — Post comment (ADF format)

### Claude API (Anthropic)

- Model: Configurable (default `claude-opus-4-6`)
- Features: Messages API, system prompts, JSON-structured output

### Google Gemini API

- Models: Gemini Pro, Flash (configurable)
- Features: JSON mode, Vision (image analysis via `gemini-vision.ts`)

## Performance Considerations

### API Timeouts & Retry

All external API calls use `withRetry()` (exponential backoff, configurable via env).

### Large PRs

Claude token limits:
- Opus 4.6 / Sonnet 4.6: 200K input, 16K output
- Haiku 4.5: 200K input, 8K output

For very large diffs, the prompt may need truncation (not auto-implemented; consider reducing PR scope or switching models).

### Storage Performance

JSON storage is simple but not designed for scale:
- All reviews loaded into memory for `/api/history`
- Consider a database adapter for >10K reviews

## Security Considerations

- Never commit `.env` — all API keys are server-side only
- All user inputs validated with Zod schemas
- PR URLs validated with regex before API calls
- Generic error messages shown to users; full errors logged server-side

## Deployment

```bash
# Build new image and start (always picks up latest code)
docker compose up -d --build

# Start only (uses existing image — code may be stale)
yarn docker:compose:up
```

> **Important**: `yarn docker:compose:up` reuses the existing Docker image. Always use `docker compose up -d --build` after code changes to ensure the latest code is included.

- Health check: `GET /api/health`
- Web port: `8082` → container `3000`
- MCP port: `8083` → container `3001`
- Volumes: `./data` and `./logs` are mounted for persistence

## Additional Resources

### External Documentation

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Material-UI Components](https://mui.com/material-ui/all-components/)
- [Anthropic API Reference](https://docs.anthropic.com/en/api)
- [GitHub REST API](https://docs.github.com/rest)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

### Internal Documentation

- [README.md](./README.md) — Main project documentation
- [docs/CLAUDE_API_SETUP.md](./docs/CLAUDE_API_SETUP.md) — Claude API setup
- [docs/GEMINI_API_SETUP.md](./docs/GEMINI_API_SETUP.md) — Gemini API setup
- [docs/GITHUB_API_SETUP.md](./docs/GITHUB_API_SETUP.md) — GitHub token setup
- [docs/JIRA_API_SETUP.md](./docs/JIRA_API_SETUP.md) — Jira token setup

## Common Questions

### Q: How do I add support for GitLab?

A: Create `src/lib/api/gitlab.ts` similar to `github.ts`, update types in `src/types/github.ts`, and modify the V2 orchestrator (`/api/reviews-v2/route.ts`) to detect and route accordingly.

### Q: Can I use a different AI provider?

A: Yes. Implement a client in `src/lib/api/`, add models to `constants/models.ts`, update `src/types/ai.ts` if needed, and route to it in the review orchestrator.

### Q: How do I customize the review criteria?

A: Edit `src/lib/constants/prompts.ts`. You can also add domain knowledge to `data/knowledge.md` — it is automatically injected into every review.

### Q: Can I run this without Jira?

A: Yes. If Jira env variables are absent, Jira integration is silently skipped in both V1 and V2 flows.

### Q: What is `data/knowledge.md` for?

A: It is a free-form Markdown file (business rules, tech conventions, architecture notes) that is loaded and appended to the AI review prompt, giving the AI project-specific context for better, more relevant feedback.

---

**Happy coding with Claude Code!**
