# Code Review Skill

Defines the quality standards and review process for performing a code review.

## 🏆 3-Phase Review Process

### Phase 1: Business Requirements (Highest Priority)

If a Jira ticket with acceptance criteria is present:

> **Always fetch Jira ticket context via MCP tools only** (`list_tickets` → `get_ticket` or `sync_ticket_from_jira`).
> Never read local files or use CLI commands to access Jira data.

1. Does the code implement all Acceptance Criteria?
2. Are all business rules and requirements met?
3. Are requirement edge cases handled?
4. Does the implementation match the intended design?

→ Flag **CRITICAL** if any AC is not met.

### Phase 2: Technical Correctness (High Priority)

1. **Critical Bugs**: Security vulnerabilities, data loss risks, race conditions.
2. **Logic & Performance**: Logic errors, memory leaks, performance bottlenecks.
3. **API Contracts**: Breaking changes or contract violations.

### Phase 3: Code Quality (Lower Priority)

1. Maintainability and readability concerns.
2. Code structure improvements (avoid trivial nits).
3. Type safety enhancements.

---

## 🛠️ Review Standards

### Analysis

- Focus on **3–10 meaningful comments** per PR. Fewer is better.
- No compliments. No trivial style comments already handled by linters.
- Keep each comment **short** (2–3 sentences max).

### Line Number Accuracy

Never trust line numbers from diff output — they may be relative or shifted.
Always verify using `cat -n <file>` or `grep -n` on the locally checked-out file.

### Code Suggestions

Use GitHub's suggestion format:

- **Single-line**: Use `line` property with a ` ```suggestion ` block.
- **Multi-line**: Use `start_line` + `line`. The block replaces all lines in that range.
- Always preserve original indentation.

---

## 🔌 MCP-Only Data Access

**All data access MUST go through MCP tools. Never read or write files directly.**

| Data | Read | Write |
|------|------|-------|
| Knowledge base | `read_knowledge` | `update_knowledge` |
| Jira tickets | `list_tickets` → `get_ticket` | — |
| Sync from Jira | `sync_ticket_from_jira` | — |
| Log files | `list_log_files` → `read_log` | — |
| Code reviews (v2) | `list_reviews` → `get_review` | `save_review` |
