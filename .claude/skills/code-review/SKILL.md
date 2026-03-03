# Code Review v2 Skill

This skill defines the technical expertise and quality standards required for performing a **Code Review0**. It focuses on _how_ to analyze code effectively and provide professional, high-signal feedback.

## 🏆 3-Phase Review Process

Always follow this prioritization hierarchy:

### PHASE 1: Business Requirements Verification (Highest Priority)

If Jira ticket with acceptance criteria is present:

1. **Acceptance Criteria**: Does the code implement all ACs?
2. **Business Requirements**: Are all business rules and requirements met?
3. **Requirement Edge Cases**: Are edge cases mentioned in the requirements handled?
4. **Design Intent**: Does the implementation match the intended design?
   → **Flag CRITICAL** issues if acceptance criteria are NOT met.

### PHASE 2: Technical Correctness (High Priority)

1. **Critical Bugs**: Security vulnerabilities, data loss risks, race conditions.
2. **Logic & Performance**: Logic errors, memory leaks, performance bottlenecks.
3. **API Contracts**: Breaking changes or contract violations.
   → These are secondary ONLY to business requirements verification.

### PHASE 3: Code Quality (Lower Priority)

1. Maintainability and readability concerns.
2. Code style or structure improvements (avoiding trivialities).
3. Type safety enhancements.

---

## 🛠️ Review Quality Guidelines

### 1. Analysis Standards (IMPORTANT)

- **Focus on IMPORTANT issues only**: Aim for 3-10 meaningful comments per PR. Fewer is better.
- **No Compliments**: Do NOT include comments that only serve to praise (e.g., "Good job").
- **Avoid Trivial Comments**: Skip minor style preferences, obvious observations, or nits handled by linters.
- **Communication Style**: Keep comment bodies **SHORT and concise** (2-3 sentences max). NEVER write lengthy explanations.

### 2. Absolute Accuracy in Line Numbers

- **Rule**: Never trust relative line numbers from diffs.
- **Technique**: Always verify the **Absolute Line Number** using `cat -n <file>`, `grep -n`, or `view_file` on the locally checked-out branch before finalizing any comment.

### 3. Code Suggestions

Use GitHub's suggestion format for actionable changes:

- **Single-line suggestion**: Use `line` property and ` ```suggestion ` block.
- **Multi-line suggestion**: Use `start_line` + `line` properties. The block replaces ALL lines from `start_line` to `line`.
- **Indentation**: ALWAYS preserve original indentation in suggestion blocks.

---

## 🧠 Self-Learning (REQUIRED)

Every review must include a `knowledgeSection` (Markdown) for the local database:

1. Tech stack/framework observations.
2. Project-specific conventions or architectural decisions discovered.
3. Recurring issues or patterns worth flagging in future reviews.

Format: Start with a heading, e.g., `## PR: [brief topic]`.
