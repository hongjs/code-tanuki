---
description: Jira Ticket Writer Agentic Workflow
---

# Jira Ticket Writer Agentic Workflow

Follow these steps when creating, drafting, or writing a Jira ticket (Epic, Story, Task, or Bug):

> **All ticket operations MUST use the `code-tanuki-tickets` MCP server.**
> Never call the HTTP API directly (no `curl`), never write JSON files directly.
> If MCP is unavailable, stop and ask the user to start the MCP server before continuing.

## MCP Tools Available

| Tool                       | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `list_tickets`             | List local tickets (with optional filters)      |
| `get_ticket`               | Get full detail of a local ticket               |
| `create_ticket`            | Create a new local ticket (not yet on Jira)     |
| `update_ticket`            | Update a local ticket's fields                  |
| `delete_ticket`            | Delete a local ticket                           |
| `sync_ticket_from_jira`    | Fetch a Jira ticket into local storage          |
| `refresh_ticket_from_jira` | Pull latest Jira state → update local record    |
| `bulk_sync_from_jira`      | Sync multiple local tickets from Jira at once   |
| `read_knowledge`           | Read `data/knowledge.md`                        |
| `update_knowledge`         | Overwrite `data/knowledge.md` with new content  |

---

## Steps

### 1. Information Gathering & Clarification Loop

- Scan the codebase and user's prompt to understand the technical and business requirements.
- Call `read_knowledge` to align with existing domain knowledge, conventions, and prior decisions.
- If the relevant codebase is unknown, ask the user for the repo name, then fetch it using `gh` CLI for analysis.
- If any existing Jira ticket is relevant, sync it first:

  `sync_ticket_from_jira({ jiraKey: "PROJ-123" })`

- If any part of the requirement is ambiguous or lacks technical detail, ask the user clarifying questions.
- Repeat until you have enough information to write "Technical Approach" and "Acceptance Criteria" with confidence.

### 2. Drafting

- Apply the **Jira Ticket Writer Skill** for structure and quality standards.
- Break large requirements into **Epic → Stories → Tasks** as appropriate.

### 3. Create the Ticket

```
create_ticket({
  title: "Concise Title",
  type: "Story",
  description: "### 📌 Background / Problem\n...\n### 🛠️ Technical Approach\n...",
  status: "To Do",
  parentKey: "ABC-XXXX"
})
```

The response contains the ticket with its generated `localId`.

### 4. Update if Needed

If you need to revise the ticket after creation:

```
update_ticket({ localId: "<uuid>", description: "...", storyPoints: 3 })
```

### 5. Knowledge Update

If new domain knowledge, conventions, or decisions emerged, call `update_knowledge` with the full updated content.

### 6. User Notification

Inform the user the ticket is drafted locally.

- Web UI for review and push to Jira: `http://localhost:8082/tickets`
