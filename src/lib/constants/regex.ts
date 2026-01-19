// Matches Jira ticket IDs in various formats:
// - feat(ABC-123): description
// - [ABC-123] description
// - ABC-123: description
// - description (ABC-123)
// - ABC-123 description
export const JIRA_TICKET_PATTERNS = [
  // Conventional commit format: feat(ABC-123):
  /(feat|fix|chore|docs|style|refactor|test|build)\(([A-Z]+-\d+)\):/,
  // Square brackets: [ABC-123]
  /\[([A-Z]+-\d+)\]/,
  // At the start with colon: ABC-123:
  /^([A-Z]+-\d+):/,
  // In parentheses: (ABC-123)
  /\(([A-Z]+-\d+)\)/,
  // At the start with space: ABC-123
  /^([A-Z]+-\d+)\s/,
];

export function extractJiraTicketFromTitle(title: string): string | null {
  for (const pattern of JIRA_TICKET_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      // Return the last capture group (the Jira ID)
      const jiraId = match[match.length - 1];
      if (jiraId) {
        return jiraId;
      }
    }
  }
  return null;
}
