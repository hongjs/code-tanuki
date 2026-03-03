---
description: Jira Ticket Writer Agentic Workflow
---

# Jira Ticket Writer Agentic Workflow

When a user requests to create, draft, or write a Jira ticket (Epic, Story, Task, or Bug) via Claude Code, follow these precise steps:

1. **Understand Requirements:**
   - Review the provided context (e.g., codebase, user prompt, or architectural decisions) to deeply understand the goal of the ticket.
   - For **Stories/Tasks**: Ensure it includes clear "Background / Problem", "Technical Approach", and "Acceptance Criteria".
   - **Important Constraint**: Use simple, short, and concise English as requested by the user. Do not use overly complex vocabulary.

2. **Generate Local Identifier:**
   - Generate a new `uuidv7` identifier using a node script or appropriate command. Let's call this `<UUID>`.

3. **Data Persistence - Detailed Ticket (JSON Storage):**
   - Create the directory: `mkdir -p data/jira-tickets/data/<UUID>`
   - Write the detailed ticket to `data/jira-tickets/data/<UUID>/item.json`. It MUST conform strictly to the ticketing interface:
     ```json
     {
       "localId": "<UUID>",
       "jiraKey": "",
       "title": "Clear, concise ticket title",
       "description": "### 📌 Background / Problem\n...\n### 🛠️ Technical Approach\n...",
       "type": "Story",
       "status": "To Do",
       "parentKey": "",
       "acceptanceCriteria": "- [ ] AC 1\n- [ ] AC 2",
       "createdAt": "2026-03-03T00:00:00.000Z",
       "updatedAt": "2026-03-03T00:00:00.000Z"
     }
     ```
     _(Note: `type` can be Epic, Story, Task, or Bug. `jiraKey` should be empty `""` for new local drafts, or filled if updating an existing synced ticket. Use real ISO-8601 strings for timestamps)._

4. **Data Persistence - Update Index File:**
   - Update the index file `data/jira-tickets/tickets.json`.
   - Read the JSON array, prepend a new index entry object (which excludes `description` and `acceptanceCriteria`), and write it back:
     ```json
     {
       "localId": "<UUID>",
       "jiraKey": "",
       "title": "Clear, concise ticket title",
       "type": "Story",
       "status": "To Do",
       "parentKey": "",
       "createdAt": "2026-03-03T00:00:00.000Z",
       "updatedAt": "2026-03-03T00:00:00.000Z"
     }
     ```

5. **Notify User:**
   - Once the files are successfully written, inform the user that the ticket has been drafted locally.
   - Instruct the user to open the web UI at `http://localhost:3000/tickets` (or the equivalent local URL) to review the ticket, make any final edits, and use the **Publish/Update** button to push it to the remote Jira instance.
