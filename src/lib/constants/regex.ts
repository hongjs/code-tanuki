export const JIRA_TICKET_PATTERN =
  /(feat|fix|chore|docs|style|refactor|test|build)\(([A-Z]+-\d+)\):/;

export function extractJiraTicketFromTitle(title: string): string | null {
  const match = title.match(JIRA_TICKET_PATTERN);
  return match ? match[2] : null;
}
