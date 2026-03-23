# Code-Tanuki - AI-Powered Code Review & Jira Assistant

> Intelligent PR review automation powered by Claude AI & Google Gemini, seamlessly integrated with GitHub and Jira. Featuring advanced code diff views and local Jira ticket management.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/MUI-7.x-blue)](https://mui.com/)
[![Claude](https://img.shields.io/badge/Claude-4.6-purple)](https://www.anthropic.com/)
[![Gemini](https://img.shields.io/badge/Gemini-3.x-orange)](https://ai.google.dev/)

## Overview

Code-Tanuki is an AI-powered development assistant designed for software teams. It leverages Claude AI or Google Gemini to provide intelligent, context-aware code reviews on your GitHub pull requests, and features a robust Jira ticket management system for offline drafting and requirement validation.

### Highlight Features

- **Code Review V2 (Diff View)**
  - GitHub-like diff viewer interface for AI-generated code reviews.
  - Contextual inline comments injected directly below the specific lines they refer to.
  - Interactive code suggestions rendered with `+`/`-` diff blocks inside comments.
  - Editable comment boxes for rewriting or refining AI suggestions before posting to GitHub.
  - Vision analysis of Jira attachments (screenshots) via Gemini Vision.
- **Jira Ticket Writer & Manager**
  - Local dashboard to manage Jira tickets with Epic, Story, and List views.
  - **Offline Drafting**: Write and refine Jira tickets locally without an active connection. Un-synced tickets are clearly marked.
  - **2-Way Syncing**: Fetch from remote, push local drafts as new tickets, or update existing remote Jira issues (`Create/Update/Sync`).

### Additional Features

- **Multi-AI Support** - Choose between Claude AI (Opus 4.6, Sonnet 4.6, Haiku 4.5) or Google Gemini (Pro, Flash).
- **GitHub Integration** - Automatic PR fetching and inline comment posting.
- **Contextual Validation** - Uses Jira ticket context to validate code against acceptance criteria.
- **Knowledge Base** - Provide a `data/knowledge.md` file for domain-specific context injected into AI reviews.
- **MCP Server** - Expose Jira ticket tools via Model Context Protocol (SSE transport) for AI agent integration.
- **OpenAPI / Swagger UI** - Auto-generated API docs available at `/swagger`.
- **Legacy Code Review (V1)** - Simple list-based review preview dialog (available alongside V2).
- **Review History** - Track past reviews with local JSON storage filtering.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5.7, Material-UI (MUI v7), Tailwind CSS v4
- **Backend**: Next.js API Routes, Anthropic SDK, Google Generative AI SDK, Octokit, Axios
- **Storage**: Local JSON files (extensible for database migrations)
- **Logging**: Winston

## Prerequisites

1. **Node.js 20+** and npm/yarn
2. **AI Provider API Key** (at least one required):
   - **Anthropic API Key** (Claude models)
   - **Google Gemini API Key** (Gemini models — free tier available)
3. **GitHub Personal Access Token** (for PR fetching and commenting)
4. **Jira API Token** _(optional — only needed for Jira integration)_

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/hongjs/code-tanuki.git
cd code-tanuki
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# AI Provider (at least one required)
ANTHROPIC_API_KEY=sk-ant-your_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub (required)
GITHUB_TOKEN=ghp_your_github_token_here

# Jira (optional)
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_token_here
```

See `docs/` for detailed setup guides for each API.

### 3. Setup Storage Directories

```bash
mkdir -p data/reviews data/reviews-v2 data/jira-tickets logs
echo "[]" > data/reviews/all-reviews.json
echo "[]" > data/reviews-v2/all-reviews.json
echo "[]" > data/jira-tickets/tickets.json
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using Code-Tanuki.

## Usage Guide

### Code Review V2 (Recommended)

1. Navigate to the **Code Review V2** page.
2. Enter your GitHub PR URL and (optionally) a Jira ticket ID.
3. Choose your AI model and click **Generate Review**.
4. Open the generated review to see the GitHub-like Diff UI.
5. Read inline comments, edit AI feedback directly on the page, then click **Approve** to post to GitHub PR.

### Legacy Code Review (V1)

1. Navigate to the **Review** page.
2. Enter your GitHub PR URL and Jira ticket ID.
3. Click **Start Review** and wait for the preview dialog.
4. Review and approve to post comments to GitHub and Jira.

### Jira Ticket Manager

1. Navigate to the **Tickets** page.
2. Use **Sync New Ticket** to pull down an existing Jira issue by ID.
3. Draft or update acceptance criteria offline.
4. Click **Publish/Update** to push local edits to your remote Jira instance.
5. Switch between Epic and Story views for hierarchy visualization.

## AI Model Selection

| Model                    | Best For                          | Context    | Setup               |
| ------------------------ | --------------------------------- | ---------- | ------------------- |
| **Claude Opus 4.6**      | Complex reviews, highest accuracy | up to 200k | Paid                |
| **Claude Sonnet 4.6**    | Balanced speed and quality        | up to 200k | Paid                |
| **Claude Haiku 4.5**     | Fast reviews, simple PRs          | up to 200k | Paid                |
| **Gemini Pro**           | Thorough reviews on a budget      | up to 2M   | Free tier available |
| **Gemini Flash**         | Fast, efficient scanning          | up to 2M   | Free tier available |

> If using the free tier of Gemini, note that output may truncate for highly complex PRs. Keep `GEMINI_MAX_TOKENS=2048` or use Claude for large diffs.

## Environment Variables

### Required

```env
GITHUB_TOKEN=ghp_...
ANTHROPIC_API_KEY=sk-ant-...   # or GEMINI_API_KEY — at least one required
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

### Optional — AI Configuration

```env
GEMINI_API_KEY=...
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

## MCP Server

Code-Tanuki exposes a [Model Context Protocol](https://modelcontextprotocol.io/) server over **SSE (HTTP)** transport, allowing AI agents (Claude Code, Claude Desktop, Cursor, etc.) to interact with Jira tickets directly.

### Available Tools

| Tool | Description |
| ---- | ----------- |
| `list_tickets` | List local tickets with optional filters (search, type, status) |
| `get_ticket` | Get full ticket detail by `localId` |
| `create_ticket` | Create a new local ticket |
| `update_ticket` | Update fields of an existing local ticket |
| `delete_ticket` | Delete a local ticket |
| `sync_ticket_from_jira` | Pull a Jira issue into local storage by Jira key |
| `push_ticket_to_jira` | Create the local ticket as a new Jira issue |
| `update_ticket_on_jira` | Push local changes to an existing Jira issue |
| `refresh_ticket_from_jira` | Pull latest state from Jira into the local record |

### Running the MCP Server

```bash
# Start standalone (default port 3001)
yarn mcp

# Custom port
MCP_PORT=3001 yarn mcp
```

The MCP endpoint is available at `http://localhost:3001/mcp`.

### Connecting to Claude Code

```bash
claude mcp add --transport http code-tanuki-tickets http://localhost:3001/mcp
```

### Connecting to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "code-tanuki-tickets": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

> When running via Docker, the MCP server starts automatically alongside the web app and is exposed on **port 8083** (`http://localhost:8083/mcp`).

## OpenAPI / Swagger

The REST API is documented using OpenAPI 3.0 and viewable via Swagger UI.

### Viewing the API Docs

Start the dev server and navigate to:

```
http://localhost:3000/swagger
```

### Regenerating the Spec

The spec is generated from Zod schemas in `src/lib/schemas/` using `@asteasolutions/zod-to-openapi`:

```bash
yarn swagger
```

This writes the output to `docs/swagger.yaml`. The Swagger UI at `/swagger` always serves the latest generated spec via `/api/swagger`.

## npm Scripts

| Command                      | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `yarn dev`                   | Start development server             |
| `yarn build`                 | Production build                     |
| `yarn start`                 | Start production server              |
| `yarn lint`                  | ESLint check                         |
| `yarn type-check`            | TypeScript type checking             |
| `yarn format`                | Prettier formatting                  |
| `yarn swagger`               | Regenerate `docs/swagger.yaml`       |
| `yarn mcp`                   | Start MCP SSE server (port 3001)     |
| `yarn docker:compose:up`     | Start web + MCP with Docker Compose  |

## Docker Deployment

```bash
# Build & start (web on 8082, MCP on 8083)
docker compose up -d --build

# View logs
docker compose logs -f
```

Both the web app and MCP server start automatically inside the same container.

## Project Structure

```
src/
├── app/                    # Next.js 16 App Router
│   ├── layout.tsx          # Root layout
│   ├── providers.tsx       # MUI theme & emotion providers
│   ├── page.tsx            # Redirects to /code-review-v2
│   ├── code-review-v2/     # V2 review pages
│   ├── review/             # V1 legacy review page
│   ├── history/            # Review history page
│   ├── tickets/            # Jira ticket manager
│   ├── how-it-works/       # Documentation page
│   └── api/                # API routes (serverless)
├── components/             # React components
├── lib/                    # Business logic & API clients
└── types/                  # TypeScript type definitions
data/
├── reviews/                # V1 review records (JSON)
├── reviews-v2/             # V2 review records (JSON)
├── jira-tickets/           # Local Jira ticket cache
└── knowledge.md            # Domain knowledge base for AI context
docs/                       # API setup guides
scripts/                    # Utility scripts (TypeScript)
```

## Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a PR for review.

## License

ISC License

---

**Made with by the Code-Tanuki team**
