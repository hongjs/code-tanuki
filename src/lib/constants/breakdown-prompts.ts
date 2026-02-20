import { FullJiraTicket, QAEntry, TechnicalCard } from '@/types/breakdown';

export const BREAKDOWN_SYSTEM_PROMPT = `You are a Senior Tech Lead with deep expertise in software architecture, agile methodologies, and technical planning. Your role is to analyze Jira user stories written from a business perspective and break them down into actionable technical implementation cards for developers.

You excel at:
- Identifying technical gaps and ambiguities in business requirements
- Asking precise clarifying questions that unblock development
- Generating comprehensive, developer-ready technical cards
- Estimating story points using Fibonacci sequence (1, 2, 3, 5, 8, 13)
- Writing thorough test strategies covering unit, integration, E2E, and regression
- Identifying technical risks before they become blockers

Always respond with valid JSON as specified in the prompt. Do not include markdown code blocks around your JSON response.`;

function formatQAHistory(qaHistory: QAEntry[]): string {
  if (qaHistory.length === 0) return 'No clarifying questions asked yet.';

  return qaHistory
    .map(
      (entry) =>
        `Round ${entry.round}:\n` +
        entry.questions
          .map((q) => {
            const answer = entry.answers.find((a) => a.questionId === q.id);
            return `Q [${q.category}]: ${q.question}\nA: ${answer?.answer || '(not answered)'}`;
          })
          .join('\n\n')
    )
    .join('\n\n---\n\n');
}

function formatTicket(ticket: FullJiraTicket): string {
  return `
Ticket: ${ticket.key} [${ticket.type}]
Summary: ${ticket.summary}
Status: ${ticket.status}
Priority: ${ticket.priority || 'Not set'}
Story Points: ${ticket.storyPoints || 'Not estimated'}
Labels: ${ticket.labels.join(', ') || 'None'}
${ticket.epicKey ? `Epic: ${ticket.epicKey} - ${ticket.epicSummary || ''}` : ''}
Reporter: ${ticket.reporter || 'Unknown'}

Description:
${ticket.description || '(No description provided)'}

${ticket.comments.length > 0 ? `Comments (${ticket.comments.length}):\n${ticket.comments.slice(0, 5).map((c) => `[${c.author}]: ${c.body}`).join('\n')}` : ''}
  `.trim();
}

function formatTickets(tickets: FullJiraTicket[]): string {
  if (tickets.length === 1) return formatTicket(tickets[0]);
  return tickets
    .map((t, i) => `### Ticket ${i + 1} of ${tickets.length}\n${formatTicket(t)}`)
    .join('\n\n---\n\n');
}

// Returns the stable context that can be cached across all calls in the same session.
// Include knowledge base, Jira tickets, and image descriptions — these never change within a session.
export function buildStableContext(
  tickets: FullJiraTicket[],
  knowledge: string,
  imageDescription?: string | null
): string {
  let context = `## Project Knowledge Base\n${knowledge || '(No knowledge base configured)'}`;
  context += `\n\n## Jira Ticket${tickets.length > 1 ? 's' : ''}\n${formatTickets(tickets)}`;
  if (imageDescription) {
    context += `\n\n## UI/Design Analysis (from attachments)\n${imageDescription}`;
  }
  return context;
}

// Returns only the task-specific part (no knowledge/tickets) — used as the non-cached block.
export function buildInitialAnalysisDynamic(
  tickets: FullJiraTicket[],
  additionalPrompt?: string
): string {
  const ticketLabel = tickets.length === 1 ? 'this Jira user story' : `these ${tickets.length} Jira user stories`;
  let prompt = `Analyze ${ticketLabel} and determine if you have enough information to generate technical implementation cards.\n`;

  if (additionalPrompt) {
    prompt += `\n## Additional Context from Requester\n${additionalPrompt}\n`;
  }

  prompt += `
## Your Task
Analyze the above ${ticketLabel}. If there are critical gaps or ambiguities that would prevent accurate technical breakdown, return clarifying questions. Otherwise, indicate you are ready to generate cards.

Focus your questions on:
- API endpoints and data contracts needed
- Database schema changes required
- External service integrations
- UI/UX requirements not covered by designs
- Business rules and edge cases
- Security and authorization requirements

IMPORTANT QUESTION RULES:
- Each question must be ATOMIC — ask ONE specific thing only
- Do NOT combine multiple sub-questions into a single question item
- Do NOT use phrases like "and", "also", "additionally" to chain multiple questions together
- If you need to ask about different tickets separately, create one question per ticket per topic
- Questions should be answerable with a short, focused response

Respond with this exact JSON structure:
{
  "needsClarification": boolean,
  "questions": [
    {
      "id": "q1",
      "question": "One specific question here",
      "category": "api" | "database" | "external-service" | "ui" | "business-logic" | "other"
    }
  ],
  "analysisNotes": "Brief notes about what you understand so far",
  "knowledgeSuggestion": {
    "section": "Section name in knowledge.md",
    "content": "Specific content to add or update",
    "reason": "Why this should be captured in the knowledge base"
  }
}

If needsClarification is false, return empty questions array.
Limit questions to maximum 5 most critical ones. Each question must cover exactly one topic.
knowledgeSuggestion is optional — only include if analyzing this ticket revealed something concrete about the project (tech patterns, architecture, domain rules, integration details, naming conventions) that is NOT already captured in the knowledge base.`;

  return prompt;
}

export function buildInitialAnalysisPrompt(
  tickets: FullJiraTicket[],
  knowledge: string,
  imageDescription?: string | null,
  additionalPrompt?: string
): string {
  return `${buildStableContext(tickets, knowledge, imageDescription)}\n\n${buildInitialAnalysisDynamic(tickets, additionalPrompt)}`;
}

export function buildReAnalysisDynamic(
  tickets: FullJiraTicket[],
  qaHistory: QAEntry[],
  additionalPrompt?: string
): string {
  const ticketLabel = tickets.length === 1 ? 'this Jira user story' : `these ${tickets.length} Jira user stories`;
  let prompt = `Re-analyze ${ticketLabel} with the answers provided to your previous questions.\n`;

  if (additionalPrompt) {
    prompt += `\n## Additional Context from Requester\n${additionalPrompt}\n`;
  }

  prompt += `
## Q&A History
${formatQAHistory(qaHistory)}

## Your Task
Based on the answers provided, determine if you now have enough information to generate technical cards, or if you need further clarification on critical points.

Only ask follow-up questions if there are truly blocking ambiguities. You have ${3 - qaHistory.length} rounds remaining.

IMPORTANT QUESTION RULES:
- Each question must be ATOMIC — ask ONE specific thing only
- Do NOT combine multiple sub-questions into a single question item
- Do NOT use phrases like "and", "also", "additionally" to chain multiple questions together
- If you need to ask about different tickets separately, create one question per ticket per topic
- Questions should be answerable with a short, focused response

Respond with this exact JSON structure:
{
  "needsClarification": boolean,
  "questions": [
    {
      "id": "q${qaHistory.length + 1}_1",
      "question": "One specific question here",
      "category": "api" | "database" | "external-service" | "ui" | "business-logic" | "other"
    }
  ],
  "analysisNotes": "Updated understanding based on answers",
  "knowledgeSuggestion": {
    "section": "Section name in knowledge.md",
    "content": "Specific content to add or update",
    "reason": "Why this should be captured in the knowledge base"
  }
}

If needsClarification is false, return empty questions array.
Limit questions to maximum 3 most critical remaining ones. Each question must cover exactly one topic.
knowledgeSuggestion is optional — only include if the Q&A answers revealed something concrete about the project that is NOT already captured in the knowledge base.`;

  return prompt;
}

export function buildReAnalysisPrompt(
  tickets: FullJiraTicket[],
  knowledge: string,
  qaHistory: QAEntry[],
  additionalPrompt?: string
): string {
  return `${buildStableContext(tickets, knowledge)}\n\n${buildReAnalysisDynamic(tickets, qaHistory, additionalPrompt)}`;
}

export function buildCardGenerationDynamic(
  tickets: FullJiraTicket[],
  qaHistory: QAEntry[],
  detailLevel: 'detailed' | 'balanced' | 'minimal',
  enableCoaching: boolean,
  additionalPrompt?: string
): string {
  const detailInstructions = {
    detailed: 'Be extremely thorough. Include detailed technical specifications, edge cases, performance considerations, and comprehensive test scenarios.',
    balanced: 'Balance detail with practicality. Cover key technical points and main test scenarios without being exhaustive.',
    minimal: 'Be concise. Focus on the most essential technical requirements and basic test coverage.',
  };

  const maxCards = parseInt(process.env.BREAKDOWN_MAX_CARDS || '15');
  const primaryTicketKey = tickets[0]?.key || 'UNKNOWN';
  const ticketKeys = tickets.map((t) => t.key).join(', ');

  let prompt = `Generate developer-ready technical implementation cards for ${tickets.length === 1 ? 'this user story' : `these ${tickets.length} user stories`}.\n`;

  if (additionalPrompt) {
    prompt += `\n## Additional Context from Requester\n${additionalPrompt}\n`;
  }

  prompt += `
## Q&A Clarifications
${formatQAHistory(qaHistory)}

## Instructions
Detail Level: ${detailLevel} - ${detailInstructions[detailLevel]}

Generate multiple developer-ready technical implementation cards (maximum ${maxCards}). A single user story MUST be broken down into multiple focused cards — one per layer, component, or concern. Do NOT create one giant card that covers everything.

**Card decomposition strategy — split by:**
- Frontend component (e.g., "Build ApprovalList component", "Build SideBySideComparison component")
- API endpoint (e.g., "Implement GET /api/approvals endpoint")
- Database / migration (e.g., "Create approval_requests table migration")
- Background job or service (e.g., "Implement notification queue worker")
- State management / store (e.g., "Add approval slice to Redux store")
- Integration / glue layer (e.g., "Wire ApprovalList component to approval API")
- Test setup (e.g., "Write integration tests for approval flow") — only if substantial

**Each card must:**
- Be implementable by one developer independently
- Cover exactly one layer/component/concern
- Have its own acceptance criteria, test strategy, and story points
${tickets.length > 1 ? `\nTickets involved: ${ticketKeys}. Assign each card's parentTicket to the most relevant ticket key.` : ''}

Rules:
- Use Fibonacci story points: 1, 2, 3, 5, 8, 13 (never other numbers)
- testStrategy.unit must have at least 1 test case
- Each card's acceptanceCriteria must be testable and specific
- Check consistency with knowledge base - flag conflicts in risks
- Card type: use "subtask" for work that's part of the parent story, "story" for independent work items
${enableCoaching ? '- Include a challengeQuestion per card: an insightful question that makes developers think deeper about their implementation approach' : ''}

Respond with this exact JSON structure:
{
  "cards": [
    {
      "id": "card-1",
      "title": "Card title (imperative, specific)",
      "type": "subtask" | "story",
      "description": "What needs to be done and why",
      "acceptanceCriteria": ["Given/When/Then or specific criteria"],
      "technicalDetails": "Implementation approach, patterns to use, files to modify",
      "testStrategy": {
        "unit": ["Test case descriptions"],
        "integration": ["Test case descriptions"],
        "e2e": ["Test case descriptions"],
        "regression": ["What existing functionality to verify still works"]
      },
      "risks": ["Technical risk or dependency to be aware of"],
      "storyPoints": 3,
      ${enableCoaching ? '"challengeQuestion": "What should developers think about regarding...",' : ''}
      "parentTicket": "${primaryTicketKey}"
    }
  ],
  "summary": "Brief summary of the breakdown approach and key technical decisions",
  "knowledgeSuggestion": {
    "section": "Section name in knowledge.md",
    "content": "Content to add or update",
    "reason": "Why this should be added to the knowledge base"
  }
}

knowledgeSuggestion is optional - only include if you discovered something worth adding to the project knowledge base.`;

  return prompt;
}

export function buildCardGenerationPrompt(
  tickets: FullJiraTicket[],
  knowledge: string,
  qaHistory: QAEntry[],
  detailLevel: 'detailed' | 'balanced' | 'minimal',
  enableCoaching: boolean,
  imageDescription?: string | null,
  additionalPrompt?: string
): string {
  return `${buildStableContext(tickets, knowledge, imageDescription)}\n\n${buildCardGenerationDynamic(tickets, qaHistory, detailLevel, enableCoaching, additionalPrompt)}`;
}

export function buildKnowledgeInitPrompt(context: string): string {
  return `Structure the following raw context into a well-organized knowledge.md file for a software development project.

## Raw Context
${context}

## Instructions
Create a structured markdown document with these sections (only include sections with relevant content):

1. **Tech Stack** - Programming languages, frameworks, libraries, databases
2. **Architecture** - System design, patterns, key architectural decisions
3. **Database Schema** - Key entities, relationships, important fields
4. **External Services** - Third-party APIs, integrations, credentials format
5. **API Conventions** - Naming patterns, response formats, authentication
6. **Code Standards** - Coding conventions, linting rules, patterns to follow
7. **Business Domain** - Key business concepts, terminology, rules
8. **Development Workflow** - Branching strategy, deployment, testing approach

Format each section clearly with markdown headers. Include specific, actionable details that would help an AI assistant provide better technical guidance.

Return ONLY the markdown content, no JSON wrapper.`;
}

export function buildKnowledgeUpdatePrompt(
  currentKnowledge: string,
  suggestion: { section: string; content: string; reason: string },
  cards: TechnicalCard[]
): string {
  return `Review this suggested update to the project knowledge base and apply it appropriately.

## Current Knowledge Base
${currentKnowledge || '(Empty)'}

## Suggested Update
Section: ${suggestion.section}
Reason: ${suggestion.reason}
Content to Add:
${suggestion.content}

## Context (Cards Generated)
${cards.map((c) => `- ${c.title}: ${c.technicalDetails.substring(0, 100)}`).join('\n')}

## Instructions
Update the knowledge base with the suggested content. Either:
1. Add a new section if the section doesn't exist
2. Append to existing section if related content exists
3. Update outdated information if there's a conflict

Return the complete updated knowledge.md content in markdown format.
Return ONLY the markdown content, no JSON wrapper.`;
}
