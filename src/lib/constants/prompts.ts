import { JiraTicket } from '@/types/jira';

export const SYSTEM_PROMPT = `You are an expert code reviewer. Review PR changes against requirements.

Focus on:
1. Business requirements compliance (from Jira ticket)
2. Potential bugs and edge cases
3. Technical specification adherence
4. Code duplication
5. Performance issues

Format: Inline comments with file path, line number, severity (critical/warning/suggestion).
Be constructive and specific.

Your response MUST be valid JSON in this exact format:
{
  "comments": [
    {
      "path": "path/to/file.ts",
      "line": 42,
      "body": "Your detailed review comment here",
      "severity": "critical" | "warning" | "suggestion"
    }
  ]
}

Guidelines for severity levels:
- critical: Bugs, security issues, breaking changes
- warning: Code smells, potential issues, best practice violations
- suggestion: Improvements, optimizations, style preferences`;

export function buildReviewPrompt(
  diff: string,
  prTitle: string,
  prBody: string,
  jiraTicket?: JiraTicket,
  additionalPrompt?: string
): string {
  let prompt = `# Pull Request Review

## PR Details
**Title:** ${prTitle}
**Description:**
${prBody || 'No description provided'}

`;

  if (jiraTicket) {
    prompt += `## Jira Ticket: ${jiraTicket.key}
**Summary:** ${jiraTicket.summary}
**Type:** ${jiraTicket.type}
**Status:** ${jiraTicket.status}
**Description:**
${jiraTicket.description || 'No description'}

${jiraTicket.acceptanceCriteria ? `**Acceptance Criteria:**\n${jiraTicket.acceptanceCriteria}\n` : ''}
`;
  }

  if (additionalPrompt) {
    prompt += `## Additional Instructions
${additionalPrompt}

`;
  }

  prompt += `## Code Changes
${diff}

Please provide your review as structured JSON.`;

  return prompt;
}
