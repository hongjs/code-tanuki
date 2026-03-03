---
description: Jira Ticket Writer Agentic Workflow
---

# Jira Ticket Writer Agentic Workflow

Follow these steps when creating, drafting, or writing a Jira ticket (Epic, Story, Task, or Bug):

1. **Information Gathering & Clarification Loop:**
   - Scan the codebase and user's prompt to understand the technical and business requirements.
   - **Requirement Verification**: If any part of the requirement is ambiguous, incomplete, or lacks technical detail, you **MUST** ask the user clarifying questions using `notify_user`.
   - **Loop**: Repeat the clarification process until you have enough information to write the "Technical Approach" and "Acceptance Criteria" with confidence. Do not proceed to drafting until the requirements are clear.
   - **Context Sync**: If any existing Jira ticket is relevant, run `yarn sync-jira <JIRA_KEY>` to fetch full context including attachments/comments.

2. **Analysis & Structural Design:**
   - Apply the **Jira Ticket Writer Skill** for quality standards.
   - Break large requirements into an **Epic** and multiple **Sub-tasks**.
   - Use simple, short, and concise English.

3. **Identifier Generation:**
   - Generate a `uuidv7` for the local database:
     `node -e 'const { v7 } = require("uuid"); console.log(v7())'`

4. **Persistence - Detail Content:**
   - Create/Update: `data/jira-tickets/data/<UUID>/item.json`
   - Content must follow this structural template:
     ```json
     {
       "localId": "<UUID>",
       "jiraKey": null,
       "title": "Concise Title",
       "description": "### 📌 Background / Problem\n...\n### 🛠️ Technical Approach\n...",
       "type": "Story",
       "status": "To Do",
       "parentKey": "BYD-XXXX",
       "createdAt": "ISO-8601-Timestamp",
       "updatedAt": "ISO-8601-Timestamp"
     }
     ```

5. **Persistence - Index Update:**
   - Prepend the summary to: `data/jira-tickets/tickets.json`
   - The entry should exclude `description` and `acceptanceCriteria`.

6. **User Notification:**
   - Inform the user that the ticket is drafted locally.
   - Point them to the Web UI for final push: `http://localhost:3000/tickets`.
