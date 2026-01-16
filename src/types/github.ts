export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  diff: string;
  repository: {
    owner: string;
    name: string;
  };
  headSha: string;
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface GitHubReviewComment {
  path: string;
  line: number;
  body: string;
}

export interface GitHubReviewRequest {
  owner: string;
  repo: string;
  pull_number: number;
  commit_id: string;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  comments: GitHubReviewComment[];
}
