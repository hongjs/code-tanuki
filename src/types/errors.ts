export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class GitHubAPIError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GITHUB_API_ERROR', 502, context);
    this.name = 'GitHubAPIError';
  }
}

export class JiraAPIError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'JIRA_API_ERROR', 502, context);
    this.name = 'JiraAPIError';
  }
}

export class ClaudeAPIError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CLAUDE_API_ERROR', 502, context);
    this.name = 'ClaudeAPIError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class DuplicateReviewError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DUPLICATE_REVIEW', 409, context);
    this.name = 'DuplicateReviewError';
  }
}
