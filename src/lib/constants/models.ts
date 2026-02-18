import { AIModel, AIProvider } from '@/types/ai';

export const CLAUDE_MODELS: AIModel[] = [
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    description: 'Most capable model, best for complex code review',
    maxTokens: 8192,
    provider: 'claude',
    outTokenPrice: 25,
    inTokenPrice: 5

  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    description: 'Balanced performance and speed',
    maxTokens: 8192,
    provider: 'claude',
    outTokenPrice: 15,
    inTokenPrice: 3
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    description: 'Fastest, good for simple reviews',
    maxTokens: 8192,
    provider: 'claude',
    outTokenPrice: 5,
    inTokenPrice: 1
  },
];

export const GEMINI_MODELS: AIModel[] = [
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: 'Most capable Gemini 3 model, best for complex reasoning tasks',
    maxTokens: 8192,
    provider: 'gemini',
    outTokenPrice: 18,
    inTokenPrice: 4
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Fast and efficient Gemini 3 model',
    maxTokens: 8192,
    provider: 'gemini',
    outTokenPrice: 3,
    inTokenPrice: 0.5
  },
];

export const DEFAULT_CLAUDE_MODEL_ID = CLAUDE_MODELS[0].id;
export const DEFAULT_GEMINI_MODEL_ID = GEMINI_MODELS[0].id;

export const ALL_AI_MODELS: AIModel[] = [...CLAUDE_MODELS, ...GEMINI_MODELS];

export function getModelById(id: string): AIModel | undefined {
  return ALL_AI_MODELS.find((m) => m.id === id);
}

export function getProviderFromModelId(modelId: string): AIProvider {
  const model = getModelById(modelId);
  return model?.provider || (modelId.startsWith('gemini') ? 'gemini' : 'claude');
}
