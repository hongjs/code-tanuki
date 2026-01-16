import { AIModel, AIProvider } from '@/types/ai';

export const CLAUDE_MODELS: AIModel[] = [
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Most capable model, best for complex code review',
    maxTokens: 8192,
    provider: 'claude',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Balanced performance and speed',
    maxTokens: 8192,
    provider: 'claude',
  },
  {
    id: 'claude-haiku-4-20250514',
    name: 'Claude Haiku 4',
    description: 'Fastest, good for simple reviews',
    maxTokens: 4096,
    provider: 'claude',
  },
];

export const GEMINI_MODELS: AIModel[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Latest and fastest Gemini model',
    maxTokens: 8192,
    provider: 'gemini',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    description: 'Lightweight, cost-efficient model',
    maxTokens: 4096,
    provider: 'gemini',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Best for complex reasoning tasks',
    maxTokens: 8192,
    provider: 'gemini',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast and versatile model',
    maxTokens: 8192,
    provider: 'gemini',
  },
];

export const ALL_AI_MODELS: AIModel[] = [...CLAUDE_MODELS, ...GEMINI_MODELS];

export function getModelById(id: string): AIModel | undefined {
  return ALL_AI_MODELS.find((m) => m.id === id);
}

export function getProviderFromModelId(modelId: string): AIProvider {
  const model = getModelById(modelId);
  return model?.provider || (modelId.startsWith('gemini') ? 'gemini' : 'claude');
}
