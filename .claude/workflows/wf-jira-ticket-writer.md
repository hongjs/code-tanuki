---
description: Jira Ticket Writer Agentic Workflow
---

# Jira Ticket Writer Agentic Workflow

Follow these steps when creating, drafting, or writing a Jira ticket (Epic, Story, Task, or Bug):

> **All persistence is done through the Code Tanuki HTTP API** (default: `http://localhost:8082`).
> Never write JSON files directly or call `yarn sync-jira`. Use the MCP tools or `curl` instead.

## MCP Tools Available

If the `code-tanuki-tickets` MCP server is connected, use these tools directly:

| Tool | Purpose |
|------|---------|
| `sync_ticket_from_jira` | Fetch a Jira ticket into local storage |
| `list_tickets` | List local tickets (with optional filters) |
| `get_ticket` | Get full detail of a local ticket |
| `create_ticket` | Create a new local ticket (not yet on Jira) |
| `update_ticket` | Update a local ticket's fields |
| `push_ticket_to_jira` | Push local ticket → create on Jira |
| `update_ticket_on_jira` | Push local changes → update existing Jira issue |
| `refresh_ticket_from_jira` | Pull latest Jira state → update local |

If MCP is not available, fall back to `curl` as shown in each step below.

---

## Steps

### 1. Information Gathering & Clarification Loop

- Scan the codebase and user's prompt to understand the technical and business requirements.
- Read `data/knowledge.md` to align with existing domain knowledge, conventions, and prior decisions.
- If the relevant codebase is unknown, ask the user for the repo name, then fetch it using `gh` CLI for analysis.
- If any existing Jira ticket is relevant, sync it first:

  **MCP:** `sync_ticket_from_jira({ jiraKey: "PROJ-123" })`

  **curl fallback:**
  ```bash
  curl -s -X POST http://localhost:8082/api/tickets/sync-new \
    -H "Content-Type: application/json" \
    -d '{"jiraKey":"PROJ-123"}'
  ```

- If any part of the requirement is ambiguous or lacks technical detail, ask the user clarifying questions.
- Repeat until you have enough information to write "Technical Approach" and "Acceptance Criteria" with confidence.

### 2. Drafting

- Apply the **Jira Ticket Writer Skill** for structure and quality standards.
- Break large requirements into **Epic → Stories → Tasks** as appropriate.

### 3. Create the Ticket via API

Call the API to create each ticket. The API handles UUID generation automatically.

**MCP:**
```
create_ticket({
  title: "Concise Title",
  type: "Story",
  description: "### 📌 Background / Problem\n...\n### 🛠️ Technical Approach\n...",
  status: "To Do",
  parentKey: "ABC-XXXX"
})
```

**curl fallback:**
```bash
curl -s -X POST http://localhost:8082/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Concise Title",
    "type": "Story",
    "description": "### 📌 Background / Problem\n...\n### 🛠️ Technical Approach\n...",
    "status": "To Do",
    "parentKey": "ABC-XXXX"
  }'
```

The response contains the ticket with its generated `localId`.

### 4. Update if Needed

If you need to revise the ticket after creation:

**MCP:** `update_ticket({ localId: "<uuid>", description: "...", storyPoints: 3 })`

**curl fallback:**
```bash
curl -s -X PUT http://localhost:8082/api/tickets/<localId> \
  -H "Content-Type: application/json" \
  -d '{"description": "...", "storyPoints": 3}'
```

### 5. Knowledge Update

If new domain knowledge, conventions, or decisions emerged, update `data/knowledge.md`.

### 6. User Notification

Inform the user the ticket is drafted locally.

- Web UI for review and final push to Jira: `http://localhost:8082/tickets`
- Or push directly via MCP: `push_ticket_to_jira({ localId: "<uuid>" })`
- Or via curl:
  ```bash
  curl -s -X POST http://localhost:8082/api/tickets/<localId>/jira
  ```
