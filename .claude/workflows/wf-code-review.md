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
   - Call MCP tool `read_knowledge` to load the project knowledge base before analysis.
   - Extract any Jira ticket ID from the PR title or body (e.g., `ABC-1234`).
   - If found, use **MCP tools only** to fetch the ticket context:
     - Call MCP tool `list_tickets` with `search: "<TICKET_ID>"` to check if the ticket is already synced locally.
     - If found locally: call MCP tool `get_ticket` with the returned `localId` to retrieve full details.
     - If NOT found locally: call MCP tool `sync_ticket_from_jira` with `jiraKey: "<TICKET_ID>"` to pull from Jira, then call `get_ticket` to retrieve the full details.
   - **Do NOT** read local files, or access `data/jira-tickets/` directly.

4. **Analysis:**
   - Apply the **Code Review Skill** for the full review process.

5. **Data Persistence:**
   - Call MCP tool `save_review` with the following fields:

   | Field          | Value                                       |
   | -------------- | ------------------------------------------- |
   | `prUrl`        | Full GitHub PR URL                          |
   | `prNumber`     | PR number (integer)                         |
   | `repository`   | `"owner/repo"`                              |
   | `prTitle`      | PR title                                    |
   | `summary`      | Brief AI-generated summary                  |
   | `jiraTicketId` | Jira ticket ID if found (optional)          |
   | `comments`     | Array of review comments (see schema below) |

   Each comment must have: `path`, `line`, `body`, `severity` (`critical`/`warning`/`suggestion`), and optionally `start_line` for multi-line suggestions.
   - The tool will return the saved review including the generated `id`. Keep the `id` for reference.
   - **Do NOT** write to `data/reviews-v2/` directly or generate UUIDs manually.

6. **Knowledge Update:**
   - If new domain knowledge, conventions, or decisions emerged, call MCP tool `read_knowledge` to get the current content, append or update the relevant sections, then call MCP tool `update_knowledge` with the full updated content.
   - **Do NOT** write to `data/knowledge.md` directly.

7. **Notify User:**
   - Inform the user the review is ready.
   - Web UI: `http://localhost:8082/code-review-v2`
