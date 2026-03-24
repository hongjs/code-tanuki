---
description: Jira Ticket Writer Agentic Workflow
---

# Jira Ticket Writer Agentic Workflow

Follow these steps when creating, drafting, or writing a Jira ticket (Epic, Story, Task, or Bug):

> **Persistence is done by writing JSON files directly** (`item.json`, `tickets.json`).
> Never call `yarn sync-jira` or push tickets to Jira on behalf of the user.
> **The agent must NOT push tickets to Jira. Only the user pushes manually.**

## MCP Tools Available (for Jira sync only)

If the `code-tanuki-tickets` MCP server is connected, use it **only for fetching from Jira**:

| Tool | Purpose |
|------|---------|
| `sync_ticket_from_jira` | Fetch a Jira ticket into local storage |
| `list_tickets` | List local tickets (with optional filters) |
| `get_ticket` | Get full detail of a local ticket |

> **Do NOT use** `push_ticket_to_jira`, `update_ticket_on_jira`, or `refresh_ticket_from_jira` — these affect Jira directly and must only be triggered by the user.

---

## Steps

### 1. Information Gathering & Clarification Loop

- Scan the codebase and user's prompt to understand the technical and business requirements.
- Read `data/knowledge.md` to align with existing domain knowledge, conventions, and prior decisions.
- If the relevant codebase is unknown, ask the user for the repo name, then fetch it using `gh` CLI for analysis.
- If any existing Jira ticket is relevant, sync it first:

  **MCP:** `sync_ticket_from_jira({ jiraKey: "PROJ-123" })`

- If any part of the requirement is ambiguous or lacks technical detail, ask the user clarifying questions.
- Repeat until you have enough information to write "Technical Approach" and "Acceptance Criteria" with confidence.

### 2. Drafting

- Apply the **Jira Ticket Writer Skill** for structure and quality standards.
- Break large requirements into **Epic → Stories → Tasks** as appropriate.

### 3. Identifier Generation

Generate a `uuidv7` for the new ticket:

```bash
node -e 'const { v7 } = require("uuid"); console.log(v7())'
```

### 4. Persistence — Detail Content

Create or update `data/jira-tickets/data/<UUID>/item.json`:

```json
{
  "localId": "<UUID>",
  "jiraKey": null,
  "title": "Concise Title",
  "description": "### 📌 Background / Problem\n...\n### 🛠️ Technical Approach\n...",
  "type": "Story",
  "status": "To Do",
  "parentKey": "ABC-XXXX",
  "createdAt": "ISO-8601-Timestamp",
  "updatedAt": "ISO-8601-Timestamp"
}
```

### 5. Persistence — Index Update

Prepend the new entry (excluding `description`) to `data/jira-tickets/tickets.json`:

```json
[
  {
    "localId": "019cb35e-e411-743b-8c44-03b8e9b21db3",
    "jiraKey": null,
    "title": "Concise Title",
    "type": "Story",
    "status": "To Do",
    "parentKey": "ABC-XXXX",
    "createdAt": "2026-03-03T11:05:00.000Z",
    "updatedAt": "2026-03-03T11:05:00.000Z"
  }
]
```

> `jiraKey` is `null` until pushed to Jira. `syncedAt` is added after sync.

### 6. Knowledge Update

If new domain knowledge, conventions, or decisions emerged, update `data/knowledge.md`.

### 7. User Notification

Inform the user the ticket is drafted locally and is ready for review.

- Web UI for review and manual push to Jira: `http://localhost:8082/tickets`

> **The agent stops here.** Pushing to Jira is a manual action performed by the user via the Web UI.
