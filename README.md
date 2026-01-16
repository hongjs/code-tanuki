# CodeOwl - AI-Powered PR Review Tool

AI-powered PR review tool for dev managers using Next.js 16, TypeScript, Material-UI, and Docker.

## Features

- 🤖 AI-powered code reviews using Claude API
- 🔗 GitHub PR integration with inline comments
- 📋 Jira ticket integration for requirements validation
- 📊 Review history with filtering and search
- 🐳 Docker support for easy deployment
- 🔄 Automatic retry with exponential backoff
- 📝 Winston logging for production debugging

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Material-UI, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **AI**: Claude Opus 4 (Anthropic API)
- **Integrations**: GitHub API (Octokit), Jira REST API
- **Storage**: JSON files (with abstraction for future DB migration)
- **Logging**: Winston
- **Validation**: Zod
- **Deployment**: Docker

## Prerequisites

- Node.js 20+
- npm or yarn
- GitHub Personal Access Token (with `repo` scope)
- Jira API Token
- Anthropic API Key

## Quick Start

### Local Development

1. **Clone the repository**

\`\`\`bash
git clone https://github.com/hongjs/codeowl.git
cd codeowl
\`\`\`

2. **Install dependencies**

\`\`\`bash
npm install
\`\`\`

3. **Set up environment variables**

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` and fill in your API keys:

- `GITHUB_TOKEN`: Your GitHub Personal Access Token
- `JIRA_BASE_URL`: Your Jira instance URL (e.g., `https://yourcompany.atlassian.net`)
- `JIRA_EMAIL`: Your Jira email
- `JIRA_API_TOKEN`: Your Jira API token
- `ANTHROPIC_API_KEY`: Your Anthropic API key

4. **Create data directories**

\`\`\`bash
mkdir -p data/reviews logs
echo "[]" > data/reviews/all-reviews.json
\`\`\`

5. **Run development server**

\`\`\`bash
npm run dev
\`\`\`

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

### Docker Deployment

1. **Build the Docker image**

\`\`\`bash
npm run docker:build
\`\`\`

2. **Run with Docker Compose**

\`\`\`bash
npm run docker:compose:up
\`\`\`

3. **View logs**

\`\`\`bash
npm run docker:compose:logs
\`\`\`

4. **Stop the container**

\`\`\`bash
npm run docker:compose:down
\`\`\`

## Usage

### Starting a Review

1. Navigate to the **Review** page
2. Enter a GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`)
3. (Optional) Enter a Jira ticket ID or leave blank to auto-extract from PR title
4. (Optional) Add additional instructions for the AI reviewer
5. Select a Claude model (Opus 4, Sonnet 4, or Haiku 4)
6. Click "Start Review"

The system will:
- Fetch PR data from GitHub
- Extract/fetch Jira ticket details (if available)
- Send to Claude for AI review
- Post inline comments to the GitHub PR
- Update the Jira ticket with review status
- Save the review to history

### Viewing History

1. Navigate to the **History** page
2. Use filters to search by:
   - PR number or repository name
   - Status (success/error)
   - Model used
   - Date range
3. Click on any review to see details

## Jira Ticket Extraction

CodeOwl automatically extracts Jira ticket IDs from PR titles using conventional commit patterns:

- `feat(BYD-1234): Add new feature` → Extracts `BYD-1234`
- `fix(PROJ-567): Fix bug` → Extracts `PROJ-567`
- Supports: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `build`

## Project Structure

\`\`\`
src/
├── app/                      # Next.js App Router
│   ├── review/              # PR review page
│   ├── history/             # Review history page
│   └── api/                 # API routes
│       ├── review/          # Main orchestrator
│       ├── github/          # GitHub API endpoints
│       ├── jira/            # Jira API endpoints
│       ├── claude/          # Claude API endpoint
│       ├── history/         # History endpoint
│       └── health/          # Health check
├── components/              # React components
│   ├── review/             # Review form components
│   ├── history/            # History table components
│   └── layout/             # Layout components
├── lib/                    # Business logic
│   ├── api/                # External API clients
│   ├── storage/            # Storage abstraction
│   ├── utils/              # Utilities
│   ├── logger/             # Winston logger
│   └── constants/          # Constants & prompts
└── types/                  # TypeScript types
\`\`\`

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `GITHUB_TOKEN`: GitHub API access
- `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`: Jira integration
- `ANTHROPIC_API_KEY`: Claude AI access
- `CLAUDE_MAX_TOKENS`: Max output tokens (default: 4096)
- `CLAUDE_TEMPERATURE`: AI temperature (default: 0.3)
- `DATA_DIR`: Data storage directory (default: `./data/reviews`)
- `LOG_DIR`: Log directory (default: `./logs`)

## Storage

CodeOwl uses JSON files for storage by default with an abstraction layer for future database migration.

- **Individual files**: `{timestamp}-{prNumber}.json`
- **Aggregated file**: `all-reviews.json`

To migrate to a database:
1. Implement `IStorageAdapter` interface for your database
2. Update `STORAGE_TYPE` environment variable
3. Run migration script to transfer data
4. No application code changes needed!

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (development only)

Log levels:
- `debug` - Development detailed logs
- `info` - Production application events
- `warn` - Warning messages
- `error` - Error messages with stack traces

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `npm run docker:compose:up` - Start with Docker Compose
- `npm run docker:compose:down` - Stop Docker Compose
- `npm run docker:compose:logs` - View Docker logs

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please visit: https://github.com/hongjs/codeowl/issues
