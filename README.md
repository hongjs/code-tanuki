# Code-Tanuki - AI-Powered Code Review & Jira Assistant

> Intelligent PR review automation powered by Claude AI & Google Gemini, seamlessly integrated with GitHub and Jira. Featuring advanced code diff views and local Jira ticket management.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Material-UI](https://img.shields.io/badge/MUI-6.3-blue)](https://mui.com/)
[![Claude](https://img.shields.io/badge/Claude-4.5-purple)](https://www.anthropic.com/)
[![Gemini](https://img.shields.io/badge/Gemini-3.0-orange)](https://ai.google.dev/)

## Overview

Code-Tanuki is an AI-powered development assistant designed for software teams. It leverages Claude AI or Google Gemini to provide intelligent, context-aware code reviews on your GitHub pull requests, and features a robust Jira ticket management system for offline drafting and requirement validation.

### 🔥 Highlight Features

- **🚀 Code Review V2 (Diff View)**
  - A comprehensive GitHub-like diff viewer interface for your AI-generated code reviews.
  - Contextual inline comments injected directly below the specific lines they refer to.
  - Interactive code suggestions rendered with `+`/`-` diff blocks inside comments.
  - Editable comment boxes allowing you to seamlessly rewrite or refine AI suggestions before posting to GitHub.
- **🎫 Jira Ticket Writer & Manager**
  - A dedicated local dashboard to manage Jira tickets with Epic, Story, and standard List views.
  - **Offline Drafting**: Write and refine Jira tickets locally without needing an active internet connection. Un-synced tickets are clearly marked.
  - **2-Way Syncing**: Fetch latest details from remote, push local drafts as new tickets, or update existing remote Jira issues seamlessly (`Create/Update/Sync`).

### Additional Features

- **🤖 Multi-AI Support** - Choose between Claude AI (Opus, Sonnet, Haiku) or Google Gemini (Pro, Flash).
- **🔗 GitHub Integration** - Automatic PR fetching and inline comment posting.
- **📋 Contextual Validation** - Uses Jira ticket contexts to validate code against actual acceptance criteria.
- **✨ Legacy Code Review (V1)** - A simple, list-based review preview dialog for quick approvals (available alongside V2).
- **📊 Review History** - Track past reviews with local JSON storage filtering.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Material-UI (MUI), Tailwind CSS
- **Backend**: Next.js API Routes, Anthropic SDK, Google Generative AI SDK, Octokit, Axios
- **Storage**: Local JSON Storage (extensible for database migrations)

## Prerequisites

1. **Node.js 20+** and npm
2. **AI Provider API Key** (at least one required):
   - **Anthropic API Key** (Claude models)
   - **Google Gemini API Key** (Gemini models - Free tier available)
3. **GitHub Personal Access Token** (for PR fetching and commenting)
4. **Jira API Token** (for Local Ticket Manager features)

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
# AI Provider
ANTHROPIC_API_KEY=sk-ant-your_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub
GITHUB_TOKEN=ghp_your_github_token_here

# Jira
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_token_here
```

### 3. Setup Storage

```bash
mkdir -p data/reviews data/reviews-v2 logs
echo "[]" > data/reviews/all-reviews.json
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using Code-Tanuki.

## Usage Guide

### 0. The AI Chat First Approach: Provisioning your Token

Everything in Code-Tanuki starts with a simple chat with the AI!

1. Provide the AI with your **AI API token** (Claude or Gemini).
2. The AI will securely provision and create local JSON configuration files (`.env`, `data/reviews`, etc.) to store your settings.
3. Once the local JSON files are generated, the Code-Tanuki UI comes to life, interacting seamlessly with Jira and GitHub exclusively via API calls.

### Code Review V2

1. Navigate to the **Review V2** page.
2. Enter your GitHub PR URL and Jira ticket ID.
3. Choose your AI model and generate the review.
4. Open the generated review to see the **GitHub-like Diff UI**.
5. Read inline comments, edit AI feedback directly on the page, and click **Approve** to post it straight to the GitHub PR.

_(If preferred, the original simple **V1 Review** is still accessible from the main history/review tools)._

### Jira Ticket Manager

1. Navigate to the **Tickets** page.
2. Use **Sync New Ticket** to pull down an existing Jira issue using its ID.
3. Use the interface to draft a ticket or update criteria offline.
4. Click **Publish/Update** to push your local edits directly to your remote Atlassian Jira instance.
5. Switch between Epic and Story views to visualize ticket parent-child hierarchies.

## AI Model Selection

| Model                    | Best For                          | Context    | Setup               |
| ------------------------ | --------------------------------- | ---------- | ------------------- |
| **Claude Opus / Sonnet** | Complex reviews, highest accuracy | up to 200k | Paid                |
| **Claude Haiku**         | Fast reviews, simple PRs          | up to 200k | Paid                |
| **Gemini Pro Preview**   | Thorough reviews on a budget      | up to 2M   | Free tier available |
| **Gemini Flash Preview** | Fast, efficient scanning          | up to 2M   | Free tier available |

_If using the free tier of Gemini, note that output may truncate for highly complex PRs. We recommend keeping `GEMINI_MAX_TOKENS=2048` or transitioning to Claude._

## Docker Deployment (Optional)

```bash
# Build & Run via Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

## Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a PR for review.

## License

ISC License

---

**Made with ❤️ by the Code-Tanuki team**
