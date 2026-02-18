import { TechnicalCard } from '@/types/breakdown';

function textNode(text: string) {
  return { type: 'text', text };
}

function paragraph(...texts: string[]) {
  return {
    type: 'paragraph',
    content: texts.map(textNode),
  };
}

function heading(level: 1 | 2 | 3, text: string) {
  return {
    type: 'heading',
    attrs: { level },
    content: [textNode(text)],
  };
}

function bulletList(items: string[]) {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraph(item)],
    })),
  };
}

function codeBlock(text: string, language?: string) {
  return {
    type: 'codeBlock',
    attrs: language ? { language } : {},
    content: [textNode(text)],
  };
}

/**
 * Build Atlassian Document Format (ADF) description for a TechnicalCard
 */
export function buildCardADF(card: TechnicalCard): object {
  const content: object[] = [];

  // Description
  content.push(heading(2, 'Description'));
  content.push(paragraph(card.description));

  // Acceptance Criteria
  if (card.acceptanceCriteria.length > 0) {
    content.push(heading(2, 'Acceptance Criteria'));
    content.push(bulletList(card.acceptanceCriteria));
  }

  // Technical Details
  if (card.technicalDetails) {
    content.push(heading(2, 'Technical Details'));
    content.push(codeBlock(card.technicalDetails));
  }

  // Test Strategy
  content.push(heading(2, 'Test Strategy'));

  if (card.testStrategy.unit.length > 0) {
    content.push(heading(3, 'Unit Tests'));
    content.push(bulletList(card.testStrategy.unit));
  }

  if (card.testStrategy.integration.length > 0) {
    content.push(heading(3, 'Integration Tests'));
    content.push(bulletList(card.testStrategy.integration));
  }

  if (card.testStrategy.e2e.length > 0) {
    content.push(heading(3, 'E2E Tests'));
    content.push(bulletList(card.testStrategy.e2e));
  }

  if (card.testStrategy.regression.length > 0) {
    content.push(heading(3, 'Regression'));
    content.push(bulletList(card.testStrategy.regression));
  }

  // Risks
  if (card.risks.length > 0) {
    content.push(heading(2, 'Risks & Considerations'));
    content.push(bulletList(card.risks));
  }

  // Story Points
  content.push(heading(2, 'Estimation'));
  content.push(paragraph(`Story Points: ${card.storyPoints}`));

  // Challenge Question (if present)
  if (card.challengeQuestion) {
    content.push(heading(2, '🤔 Challenge Question'));
    content.push(paragraph(card.challengeQuestion));
  }

  return {
    type: 'doc',
    version: 1,
    content,
  };
}

/**
 * Build ADF summary comment for the parent ticket after breakdown publishing
 */
export function buildSummaryCommentADF(
  cards: TechnicalCard[],
  breakdownId: string
): object {
  const totalPoints = cards.reduce((sum, c) => sum + c.storyPoints, 0);
  const subtasks = cards.filter((c) => c.type === 'subtask');
  const stories = cards.filter((c) => c.type === 'story');

  const content: object[] = [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '🔧 Technical Breakdown completed by Code Tanuki',
          marks: [{ type: 'strong' }],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        textNode(`Generated ${cards.length} technical card(s) — Total: ${totalPoints} story points`),
      ],
    },
  ];

  if (subtasks.length > 0) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: `Subtasks (${subtasks.length}):`, marks: [{ type: 'strong' }] }],
    });
    content.push(bulletList(subtasks.map((c) => `${c.title} (${c.storyPoints} SP)`)));
  }

  if (stories.length > 0) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: `Linked Stories (${stories.length}):`, marks: [{ type: 'strong' }] }],
    });
    content.push(bulletList(stories.map((c) => `${c.title} (${c.storyPoints} SP)`)));
  }

  content.push({
    type: 'paragraph',
    content: [
      textNode(`Breakdown ID: ${breakdownId}`),
    ],
  });

  return {
    type: 'doc',
    version: 1,
    content,
  };
}
