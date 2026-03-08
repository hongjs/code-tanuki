---
description: Code Review Agentic Workflow
---

# Code Review Agentic Workflow

When a user requests a code review by providing a GitHub PR link, follow these steps:

1. **Fetch PR Data:**
   - Extract the PR number and repository from the link.
   - `gh pr view <PR_NUMBER> --json title,body`
   - `gh pr diff <PR_NUMBER>`

2. **Local Checkout:**
   - `gh pr checkout <PR_NUMBER>`
   - Read the modified files to understand changes in context.

3. **Knowledge & Jira Context:**
   - Read `data/knowledge.md` as the knowledge base before analysis.
   - Extract any Jira ticket ID from the PR title or body (e.g., `ABC-1234`).
   - If found:
     - Check `data/jira-tickets/tickets.json` for existing entry.
     - If NOT synced: run `yarn sync-jira <TICKET_ID>` to pull full context including comments and images.
     - If already synced: read `data/jira-tickets/data/{ticketId}/item.json`.

4. **Analysis:**
   - Apply the **Code Review Skill** for the full review process.

5. **Data Persistence:**
   - Generate a `uuidv7`:
     `node -e 'const { v7 } = require("uuid"); console.log(v7())'`
   - Create directory: `mkdir -p data/reviews-v2/data/<UUID>`
   - Write to `data/reviews-v2/data/<UUID>/item.json`:

````json
{
  "id": "<UUID>",
  "timestamp": "ISO-8601-Format",
  "prUrl": "Full PR URL",
  "prNumber": 1234,
  "repository": "owner/repo",
  "prTitle": "PR Title",
  "status": "pending",
  "summary": "Brief summary",
  "jiraTicketId": "ABC-1234",
  "comments": [
    {
      "path": "path/to/file.ts",
      "line": 42,
      "start_line": 38,
      "body": "Comment body. Use ```suggestion blocks if applicable.",
      "severity": "critical | warning | suggestion"
    }
  ]
}
````

- Prepend summary entry (excluding `comments`) to `data/reviews-v2/all-reviews.json`.

6. **Knowledge Update:**
   - If new domain knowledge, conventions, or decisions emerged, update `data/knowledge.md`.

7. **Notify User:**
   - Inform the user the review is ready.
   - Web UI: `http://localhost:8082/code-review-v2`
