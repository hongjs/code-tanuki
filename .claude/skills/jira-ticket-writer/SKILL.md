# Jira Ticket Writer Skill

This skill defines the technical standards and structural requirements for drafting professional Jira tickets. It focuses on _governance and quality_ while the execution steps are managed by the `.claude/workflows/jira-ticket-writer.md` workflow.

## 🏆 Quality Standards

### 1. Formatting & Content

- **Markdown Standards**: Always use standard GitHub-Flavored Markdown (GFM). Avoid raw Jira Wiki Markup. Use `###`, `- [ ]`, and ` ```language ` blocks.
- **Concise English**: Use simple, short, and concise English. Avoid verbose explanations. Focus on actionable items.
- **Ticket Anatomy**: Every Story/Task should have:
  - `### 📌 Background / Problem`
  - `### 🛠️ Technical Approach`
  - `### ✅ Acceptance Criteria` (using `- [ ]` markdown)

### 2. Structural Integrity

- **Granularity**: Large tasks (especially API endpoints) must be broken into an **Epic** and small, manageable **Sub-tasks**.
- **Explicit Relationships**: Always link sub-tasks to their parent Epic using real Jira Keys (e.g., `BYD-1234`).
- **UUIDv7 Requirement**: The `localId` **MUST ALWAYS** be a UUIDv7 to ensure chronological sorting by the time-based prefix.

### 3. Data Integrity

- **Consolidated Content**: To avoid UI redundancy, **Acceptance Criteria MUST be written directly within the `description` field** as a markdown section (`### ✅ Acceptance Criteria`). Do NOT use a separate `acceptanceCriteria` field in the JSON payload.
- **New Tickets**: Instantiate with `jiraKey: null`. This allows the sync mechanism to rely on the remote Jira API to provision the sequence number.
- **Dual Update**: When creating/editing a ticket, you **MUST** update both:
  - `data/jira-tickets/tickets.json` (Index/Summary)
  - `data/jira-tickets/data/{localId}/item.json` (Detail/Payload)

---

## 🛠️ Operational Guidelines

### Syncing Context

- **Rule**: If a Jira Key exists, the AI **MUST** prioritize reading the local synced data.
- **Command**: If context is missing, use `yarn sync-jira <JIRA_KEY>` to fetch full details, including attachments and comments, to inform the ticket drafting process.

### Communication

- Direct the user to the Web UI at `http://localhost:3000/tickets` for final review and publishing to Jira.
