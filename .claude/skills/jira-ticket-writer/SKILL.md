# Jira Ticket Writer Skill

This skill allows the AI to draft Jira tickets locally using the project's structured storage.

## When to use

Use this skill when the user wants to create, draft, or write a Jira ticket (Epic, Story, Task, or Bug).

## Instructions

1. **Understand Goals**: Review codebase and user prompt for context.
2. **Style Constraint**: Use **simple, short, and concise English**.
3. **Generate UUID**: Use a UUID v7 for the `localId`.
4. **Write Detailed Ticket**:
   - Create `data/jira-tickets/data/<UUID>/item.json`.
   - Follow the schema: `localId`, `jiraKey` (empty), `title`, `description`, `type`, `status`, `parentKey`, `acceptanceCriteria`.
   - Use Markdown for `description` heads like `### 📌 Background / Problem`.
5. **Update Index**:
   - Prepend the new entry to `data/jira-tickets/tickets.json`.
6. **Notify**:
   - Tell the user the ticket is drafted.
   - Direct them to `http://localhost:3000/tickets` to publish/update to Jira.
