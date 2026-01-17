# 🦉 CodeOwl - AI-Powered Code Review

> Intelligent PR review automation powered by Claude AI, seamlessly integrated with GitHub and Jira.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/MUI-6.3-blue)](https://mui.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

## Overview

CodeOwl is an AI-powered code review tool designed for development teams. It leverages Claude AI to provide intelligent, context-aware code reviews on your GitHub pull requests, with optional Jira integration for requirement validation.

### Key Features

- **🤖 AI-Powered Reviews** - Leverage Claude Opus 4, Sonnet 4, or Haiku 4 for intelligent code analysis
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
2. **Anthropic API Key** (required)
   - Get from: https://console.anthropic.com/settings/keys
   - See [Setup Guide](./docs/CLAUDE_API_SETUP.md)
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
# Required - Claude AI
ANTHROPIC_API_KEY=sk-ant-your_api_key_here

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
5. Select your preferred Claude model
6. Click **Start Review**

### Review Process

CodeOwl will:

1. **Fetch PR Data** - Download diff, files, and metadata from GitHub
2. **Extract Jira Context** - Get ticket details and acceptance criteria (if configured)
3. **AI Analysis** - Claude analyzes the code for:
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

- `ANTHROPIC_API_KEY` - Your Claude API key (starts with `sk-ant-`)
- `GITHUB_TOKEN` - GitHub Personal Access Token

#### Optional (Jira)

- `JIRA_BASE_URL` - Your Jira instance URL
- `JIRA_EMAIL` - Your Jira account email
- `JIRA_API_TOKEN` - Jira API token

#### Model Settings

- `CLAUDE_MODEL_DEFAULT` - Default model (default: `claude-haiku-4-5-20251001`)
- `CLAUDE_MAX_TOKENS` - Max output tokens (default: `4096`)
- `CLAUDE_TEMPERATURE` - AI temperature (default: `0.3`)

#### Storage & Logging

- `DATA_DIR` - Review storage directory (default: `./data/reviews`)
- `LOG_DIR` - Log directory (default: `./logs`)
- `LOG_LEVEL` - Logging level: `debug` | `info` | `warn` | `error` (default: `info`)

#### Retry Configuration

- `RETRY_MAX_ATTEMPTS` - Max retry attempts (default: `3`)
- `RETRY_BASE_DELAY_MS` - Base delay between retries (default: `1000`)
- `RETRY_MAX_DELAY_MS` - Max delay between retries (default: `10000`)

### Available Claude Models

| Model | ID | Best For | Speed |
|-------|----|---------:|------:|
| Claude Opus 4 | `claude-opus-4-20250514` | Complex reviews, high accuracy | Slower |
| Claude Sonnet 4 | `claude-sonnet-4-5-20250929` | Balanced performance | Medium |
| Claude Haiku 4 | `claude-haiku-4-5-20251001` | Quick reviews, simple PRs | Fastest |

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
