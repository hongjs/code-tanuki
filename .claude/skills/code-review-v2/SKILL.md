# Code Review v2 Skill

This skill allows the AI to perform a structured "Code Review v2" process.

## When to use

Use this skill when a user provides a GitHub pull request URL and asks for a code review.

## Instructions

1. **Fetch PR details**:
   - Extract the PR number and repository from the link.
   - Run `gh pr view <PR_NUMBER> --json title,body` and `gh pr diff <PR_NUMBER>`.
2. **Local context**:
   - Checkout the branch: `gh pr checkout <PR_NUMBER>`.
   - Read the modified files to understand the changes.
3. **Jira Context**:
   - Search for Jira ticket IDs (e.g., `ABC-1234`) in the PR metadata.
   - If found, check `data/jira-tickets/data/{ticketId}/item.json` for context.
4. **Analysis**:
   - Review for bugs, edge cases, and adherence to `data/knowledge.md`.
   - Prepare comments with file paths and line numbers.
5. **Persist to JSON**:
   - Generate a UUID v7.
   - Create `data/reviews-v2/data/<UUID>/`.
   - Write `item.json` matching the `ReviewV2Detail` interface.
   - Update `data/reviews-v2/all-reviews.json`.
6. **Respond**:
   - Tell the user the review is ready at `http://localhost:3000/code-review-v2`.
