import { ClaudeModel } from '@/types/claude';

export const CLAUDE_MODELS: ClaudeModel[] = [
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Most capable model, best for complex code review',
    maxTokens: 8192,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Balanced performance and speed',
    maxTokens: 8192,
  },
  {
    id: 'claude-haiku-4-20250514',
    name: 'Claude Haiku 4',
    description: 'Fastest, good for simple reviews',
    maxTokens: 4096,
  },
];

export function getModelById(id: string): ClaudeModel | undefined {
  return CLAUDE_MODELS.find((m) => m.id === id);
}
