import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  GITHUB_TOKEN: z.string().min(1, 'GitHub token is required'),
  GITHUB_API_BASE_URL: z.string().url().default('https://api.github.com'),

  JIRA_BASE_URL: z.string().url(),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),

  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required'),
  CLAUDE_MODEL_DEFAULT: z.string().default('claude-opus-4-20250514'),
  CLAUDE_MAX_TOKENS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('4096'),
  CLAUDE_TEMPERATURE: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(1))
    .default('0.3'),

  STORAGE_TYPE: z.enum(['json']).default('json'),
  DATA_DIR: z.string().default('./data/reviews'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_DIR: z.string().default('./logs'),

  RETRY_MAX_ATTEMPTS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('3'),
  RETRY_BASE_DELAY_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('1000'),
  RETRY_MAX_DELAY_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('10000'),

  DUPLICATE_CHECK_MINUTES: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('5'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();
