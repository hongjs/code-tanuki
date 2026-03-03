---
description: Code Review v2 Agentic Workflow
---

# Code Review v2 Agentic Workflow

When a user requests a code review via Claude Code by providing a GitHub PR link, follow these precise steps:

1. **AI GitHub Fetch Request:**
   - Extract the PR number and repository from the user's provided link.
   - Use the `gh` CLI (or GitHub REST API) to fetch the PR details, including the PR title, body, and the diff.
   - `gh pr view <PR_NUMBER> --json title,body`
   - `gh pr diff <PR_NUMBER>`

2. **Local Context Checkout:**
   - Checkout the working branch locally: `gh pr checkout <PR_NUMBER>`
   - Analyze the codebase to understand the changes in context. Read the files modified by the PR.

3. **Jira Context Sync:**
   - Automatically extract any Jira ticket ID from the PR title or body (e.g., `ABC-1234`).
   - If found, run the ticket sync mechanism or read the existing ticket data from `data/jira-tickets/data/{ticketId}`. Ensure attachments/images and comments are read to understand the full context.
   - Use the workspace's TicketStorage utility or API if necessary.

4. **AI Analysis:**
   - Perform a thorough code review. Look for bugs, edge cases, missing tests, and adherence to the project's knowledge base (`data/knowledge.md`).
   - Generate your review comments pointing exactly to the file paths and line numbers affected by the PR.

5. **Data Persistence (JSON Storage):**
   - Generate a new `uuidv7` identifier using a node script or appropriate command. Let's call this `<UUID>`.
   - Create the directory: `mkdir -p data/reviews-v2/data/<UUID>`
   - Write your detailed review to `data/reviews-v2/data/<UUID>/item.json`. It MUST conform strictly to the TypeScript interface `ReviewV2Detail`:
     ````json
     {
       "id": "<UUID>",
       "timestamp": "ISO-8601-Format",
       "prUrl": "Full PR string URL",
       "prNumber": 1234,
       "repository": "owner/repo",
       "prTitle": "Extracted PR Title",
       "status": "pending",
       "summary": "Brief summary of your review",
       "jiraTicketId": "ABC-1234",
       "comments": [
         {
           "path": "path/to/changed/file.ts",
           "line": 15,
           "body": "Your review comment string. You can include ```suggestion blocks.",
           "severity": "suggestion"
         }
       ]
     }
     ````
   - Update the index file `data/reviews-v2/all-reviews.json`. Read the JSON array, prepend a new `ReviewV2IndexEntry` object (excluding the `comments` array), and write it back.

6. **Notify User:**
   - Once the files are successfully written, inform the user that the review has been generated locally.
   - Instruct the user to open the web UI at `http://localhost:3000/code-review-v2` to read the review, edit it if necessary, and approve it for submission to GitHub.
