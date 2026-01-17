# 🦉 CodeOwl - AI-Powered Code Review

> Intelligent PR review automation powered by Claude AI & Google Gemini, seamlessly integrated with GitHub and Jira.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/MUI-6.3-blue)](https://mui.com/)
[![Claude](https://img.shields.io/badge/Claude-4.5-purple)](https://www.anthropic.com/)
[![Gemini](https://img.shields.io/badge/Gemini-3.0-orange)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

## Overview

CodeOwl is an AI-powered code review tool designed for development teams. It leverages Claude AI or Google Gemini to provide intelligent, context-aware code reviews on your GitHub pull requests, with optional Jira integration for requirement validation.

### Key Features

- **🤖 Multi-AI Support** - Choose between Claude AI (Opus, Sonnet, Haiku) or Google Gemini (3 Pro, 3 Flash)
- **🔗 GitHub Integration** - Automatic PR fetching and inline comment posting
- **📋 Jira Integration** - Validate code against acceptance criteria (optional)
- **✨ Beautiful UI** - Modern, colorful interface with smooth animations
- **📊 Review History** - Track all reviews with filtering and search capabilities
- **🐳 Docker Ready** - Easy deployment with Docker Compose
- **🔄 Smart Retry Logic** - Automatic retry with exponential backoff
- **📝 Production Logging** - Winston-based structured logging
- **🎯 Type Safe** - Full TypeScript with Zod validation

## Tech Stack

### Frontend
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Material-UI (MUI)** for component library
- **Tailwind CSS** for utility styling
- **Emotion** for styled components

### Backend
- **Next.js API Routes** for serverless functions
- **Anthropic SDK** for Claude AI integration
- **Google Generative AI SDK** for Gemini integration
- **Octokit** for GitHub API
- **Axios** for Jira REST API
- **Winston** for logging
- **Zod** for runtime validation

### Infrastructure
- **Docker** for containerization
- **Docker Compose** for orchestration
- **JSON Storage** with abstraction for future DB migration

## Prerequisites

Before you begin, you'll need:

1. **Node.js 20+** and npm
2. **AI Provider API Key** (at least one required):
   - **Anthropic API Key** for Claude models
     - Get from: https://console.anthropic.com/settings/keys
     - See [Setup Guide](./docs/CLAUDE_API_SETUP.md)
   - **Google Gemini API Key** for Gemini models (optional alternative)
     - Get from: https://aistudio.google.com/app/apikey
     - Free tier available
3. **GitHub Personal Access Token** (required)
   - Fine-grained token with "Pull requests: Read and write"
   - See [Setup Guide](./docs/GITHUB_API_SETUP.md)
4. **Jira API Token** (optional)
   - See [Setup Guide](./docs/JIRA_API_SETUP.md)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/hongjs/codeowl.git
cd codeowl
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# AI Provider - At least one required
ANTHROPIC_API_KEY=sk-ant-your_api_key_here  # For Claude models
GEMINI_API_KEY=your_gemini_api_key_here      # For Gemini models (optional)

# Required - GitHub
GITHUB_TOKEN=ghp_your_github_token_here

# Optional - Jira (leave blank to skip Jira integration)
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_token_here
```

### 3. Create Required Directories

```bash
mkdir -p data/reviews logs
echo "[]" > data/reviews/all-reviews.json
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're ready to go!

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t codeowl:latest .

# Run container
docker run -p 3000:3000 \
  --env-file .env \
  -v ./data:/app/data \
  -v ./logs:/app/logs \
  codeowl:latest
```

## Usage

### Starting a Code Review

1. Navigate to the **Review** page
2. Enter a GitHub PR URL:
   ```
   https://github.com/owner/repo/pull/123
   ```
3. (Optional) Enter a Jira ticket ID or leave blank for auto-extraction
4. (Optional) Add custom instructions for the AI reviewer
5. Select your preferred AI model (Claude or Gemini)
6. Click **Start Review**

### Review Process

CodeOwl will:

1. **Fetch PR Data** - Download diff, files, and metadata from GitHub
2. **Extract Jira Context** - Get ticket details and acceptance criteria (if configured)
3. **AI Analysis** - Your chosen AI model (Claude or Gemini) analyzes the code for:
   - Bugs and potential issues
   - Security vulnerabilities
   - Code quality and best practices
   - Requirement compliance
4. **Preview** - Review AI comments before posting
5. **Post Comments** - Inline comments added to GitHub PR
6. **Update Jira** - Post review summary to Jira ticket (if configured)

### Jira Ticket Auto-Extraction

CodeOwl automatically extracts Jira ticket IDs from PR titles:

```
feat(BYD-1234): Add user authentication → Extracts BYD-1234
fix(PROJ-567): Fix login bug → Extracts PROJ-567
```

Supported prefixes: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `perf`

### Viewing History

Navigate to the **History** page to:
- View all completed reviews
- Filter by status, model, or date
- Search by PR number or repository
- Click any review for full details

## Project Structure

```
codeowl/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── review/              # Review page
│   │   ├── history/             # History page
│   │   ├── layout.tsx           # Root layout with sidebar
│   │   └── api/                 # API Routes
│   │       ├── review/          # Main orchestrator
│   │       ├── github/          # GitHub endpoints
│   │       ├── jira/            # Jira endpoints
│   │       └── health/          # Health check
│   ├── components/              # React Components
│   │   ├── review/             # Review form & progress
│   │   ├── history/            # History table & filters
│   │   └── layout/             # Sidebar navigation
│   ├── lib/                    # Business Logic
│   │   ├── api/                # API clients (GitHub, Jira, Claude)
│   │   ├── storage/            # Storage abstraction
│   │   ├── utils/              # Utilities & helpers
│   │   ├── logger/             # Winston logger
│   │   └── constants/          # Constants, prompts, models
│   └── types/                  # TypeScript Types
├── data/                       # Review data (JSON files)
├── logs/                       # Application logs
├── docs/                       # Documentation
├── Dockerfile                  # Docker configuration
├── docker-compose.yml          # Docker Compose setup
└── .env                        # Environment variables
```

## Configuration

### Environment Variables

#### Required

- `GITHUB_TOKEN` - GitHub Personal Access Token

#### AI Provider (At least one required)

**Claude AI:**
- `ANTHROPIC_API_KEY` - Your Claude API key (starts with `sk-ant-`)
- `CLAUDE_MODEL_DEFAULT` - Default Claude model (default: `claude-haiku-4-5-20251001`)
- `CLAUDE_MAX_TOKENS` - Max output tokens (default: `4096`)
- `CLAUDE_TEMPERATURE` - AI temperature 0-1 (default: `0.3`)

**Google Gemini (Optional):**
- `GEMINI_API_KEY` - Your Gemini API key (optional)
- `GEMINI_MODEL_DEFAULT` - Default Gemini model (default: `gemini-2.0-flash`)
- `GEMINI_MAX_TOKENS` - Max output tokens (default: `2048`, recommended for free tier)
- `GEMINI_TEMPERATURE` - AI temperature 0-2 (default: `0.3`)

> **Note for Free Tier Users**: The free tier works best with `GEMINI_MAX_TOKENS=2048` or lower to avoid response truncation. For larger PRs, consider using Claude or upgrading to Gemini paid tier.

#### Optional (Jira)

- `JIRA_BASE_URL` - Your Jira instance URL
- `JIRA_EMAIL` - Your Jira account email
- `JIRA_API_TOKEN` - Jira API token

#### Storage & Logging

- `DATA_DIR` - Review storage directory (default: `./data/reviews`)
- `LOG_DIR` - Log directory (default: `./logs`)
- `LOG_LEVEL` - Logging level: `debug` | `info` | `warn` | `error` (default: `info`)

#### Retry Configuration

- `RETRY_MAX_ATTEMPTS` - Max retry attempts (default: `3`)
- `RETRY_BASE_DELAY_MS` - Base delay between retries (default: `1000`)
- `RETRY_MAX_DELAY_MS` - Max delay between retries (default: `10000`)

### Available AI Models

#### Claude Models (Anthropic)

| Model | ID | Best For | Speed | Max Tokens |
|-------|----|---------:|------:|-----------:|
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | Complex reviews, highest accuracy | Slower | 8192 |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | Balanced performance | Medium | 8192 |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Quick reviews, simple PRs | Fastest | 4096 |

#### Gemini Models (Google)

| Model | ID | Best For | Speed | Max Tokens* |
|-------|----|---------:|------:|-----------:|
| Gemini 3 Pro Preview | `gemini-3-pro-preview` | Complex reasoning, thorough reviews | Medium | 2048** |
| Gemini 3 Flash Preview | `gemini-3-flash-preview` | Fast reviews, efficient | Fast | 2048** |

**Note:** You can use either Claude or Gemini models. Configure the appropriate API key in your `.env` file.

\* Max output tokens (configurable)
\** Recommended setting for free tier to avoid response truncation. Paid tier supports higher limits.

### Getting Your Gemini API Key (Free Tier Available!)

Google Gemini offers a **free tier** that's perfect for trying out CodeOwl:

1. **Visit Google AI Studio**: https://aistudio.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click "Create API Key"**
4. **Copy your API key** and add it to `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

**Free Tier Limits:**
- 15 requests per minute
- 1 million tokens per minute
- 1,500 requests per day
- Recommended max output tokens: 2048

**Important**: To avoid response truncation on the free tier, make sure to set:
```env
GEMINI_MAX_TOKENS=2048
```

For larger PRs (>500 lines), you may get partial reviews. Consider:
- Using Claude AI instead
- Breaking PRs into smaller chunks
- Upgrading to Gemini's paid tier

### Choosing Between Claude and Gemini

| Feature | Claude | Gemini |
|---------|--------|--------|
| **Cost** | Paid (usage-based) | Free tier available |
| **Best Models** | Opus 4.5, Sonnet 4.5 | Gemini 3 Pro Preview |
| **Speed** | Very fast (Haiku) | Very fast (Flash) |
| **Code Understanding** | Excellent | Excellent |
| **Context Window** | 200K tokens | 2M tokens (Gemini 3) |
| **Best For** | Production workloads | Testing, small teams |

**Recommendation:**
- **Start with Gemini** (free tier) to test CodeOwl
- **Upgrade to Claude** for production use or larger teams

## Storage

CodeOwl uses JSON file storage by default with an abstraction layer for easy database migration:

- **Individual Reviews**: `data/reviews/{timestamp}-{prNumber}.json`
- **Aggregated Index**: `data/reviews/all-reviews.json`

### Migrating to a Database

1. Implement `IStorageAdapter` interface for your database
2. Update `STORAGE_TYPE` environment variable
3. No application code changes needed!

## Logging

Logs are written to:

- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (development mode only)

Log levels: `debug` | `info` | `warn` | `error`

## Available Scripts

### Development

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Docker

```bash
npm run docker:build         # Build Docker image
npm run docker:run           # Run Docker container
npm run docker:compose:up    # Start with Docker Compose
npm run docker:compose:down  # Stop Docker Compose
npm run docker:compose:logs  # View Docker logs
```

## API Endpoints

### Health Check

```bash
GET /api/health
```

### Review

```bash
POST /api/review
Content-Type: application/json

{
  "prUrl": "https://github.com/owner/repo/pull/123",
  "jiraTicketId": "BYD-1234",  // optional
  "additionalPrompt": "...",    // optional
  "modelId": "claude-opus-4-20250514",
  "previewOnly": true
}
```

### Submit Review

```bash
POST /api/review/submit
Content-Type: application/json

{
  "prUrl": "https://github.com/owner/repo/pull/123",
  "jiraTicketId": "BYD-1234",  // optional
  "modelId": "claude-opus-4-20250514",
  "comments": [...]
}
```

### History

```bash
GET /api/history
```

## Troubleshooting

### Build Errors

```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Environment Variable Issues

Make sure `.env` exists and contains all required variables:

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

### Gemini Response Truncation (Free Tier)

**Error**: `Failed to parse Gemini response as JSON. Response may be truncated.`

**Solution**: The free tier has token limits. Update your `.env`:

```env
# Reduce max tokens for free tier
GEMINI_MAX_TOKENS=2048

# Or use an even lower value for very large PRs
GEMINI_MAX_TOKENS=1024
```

**Alternative**: Switch to Claude AI for larger PRs:
```env
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

Then select a Claude model in the UI instead of Gemini.

### Storage Errors

Ensure directories exist:

```bash
mkdir -p data/reviews logs
echo "[]" > data/reviews/all-reviews.json
```

### Docker Issues

```bash
# Clean and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Documentation

- [Getting Started Guide](./GETTING_STARTED.md)
- [UI Improvements](./UI_IMPROVEMENTS.md)
- [Claude API Setup](./docs/CLAUDE_API_SETUP.md) (if available)
- [GitHub API Setup](./docs/GITHUB_API_SETUP.md) (if available)
- [Jira API Setup](./docs/JIRA_API_SETUP.md) (if available)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For issues and questions:
- GitHub Issues: https://github.com/hongjs/codeowl/issues
- Documentation: See `/docs` folder

---

**Made with ❤️ by the CodeOwl team**
