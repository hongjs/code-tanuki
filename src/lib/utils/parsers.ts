import { ValidationError } from '@/types/errors';

export interface ParsedGitHubURL {
  owner: string;
  repo: string;
  number: number;
}

export function parseGitHubPRUrl(url: string): ParsedGitHubURL {
  // Supports:
  // - https://github.com/owner/repo/pull/123
  // - https://github.com/owner/repo/pull/123/files
  const regex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/;
  const match = url.match(regex);

  if (!match) {
    throw new ValidationError('Invalid GitHub PR URL format', { url });
  }

  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3], 10),
  };
}
