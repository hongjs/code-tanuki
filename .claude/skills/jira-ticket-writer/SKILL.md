# Jira Ticket Writer Skill

Defines quality standards for writing Jira tickets.

## Ticket Structure

Each ticket description must contain:

### 📌 Background / Problem

Why this ticket exists. What business or technical problem does it solve?

### 🛠️ Technical Approach

What needs to be done at a high level. Provide enough context for the developer to understand the scope — include examples or references where helpful. Avoid prescribing exact implementation steps; leave room for the developer to reason and decide.

### ✅ Acceptance Criteria

Clear, testable conditions that define "done". Use Given/When/Then or bullet format.

---

## Writing Standards

- **Clarity over brevity**: Write concisely, but expand with context or examples when it genuinely aids understanding.
- **Don't over-guide**: Describe the _what_ and _why_, not the _how_. Developers should have space to learn and make implementation decisions.
- **Hierarchy**: Story → Task → Sub-task. Use the appropriate type for scope.
  - **Story**: A user-facing capability or behavior.
  - **Task**: A technical unit of work (no direct user value on its own).
  - **Sub-task**: A smaller unit broken down from a Story or Task.
- **Scope**: One ticket = one clear responsibility. Split if in doubt.
- **Language**: English only. Plain language — no jargon without explanation.
