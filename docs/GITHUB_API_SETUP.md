# GitHub API Setup Guide

This document explains how to configure GitHub API access for CodeOwl's PR review functionality.

## Required GitHub API Operations

CodeOwl uses the following GitHub API operations:

- **`pulls.get()`** - Fetch PR details (title, body, state, head SHA)
- **`pulls.listFiles()`** - List PR files and diffs for AI review
- **`pulls.createReview()`** - Post AI-generated review comments

## Minimum Required API Scopes

### Option 1: Fine-Grained Personal Access Token (Recommended ✅)

Fine-grained tokens provide better security by limiting access to specific repositories and permissions.

**Repository Permissions:**
- **Pull requests: Read and write** ✓

**Advantages:**
- More secure (principle of least privilege)
- Can limit access to specific repositories only
- Easier to audit and manage
- Granular permission control

**How to Create:**

1. Navigate to: https://github.com/settings/tokens?type=beta
2. Click **"Generate new token"**
3. Configure the token:
   - **Token name**: `CodeOwl PR Review`
   - **Expiration**: Choose based on your security requirements (90 days recommended)
   - **Repository access**:
     - Select **"Only select repositories"**
     - Choose the repositories you want CodeOwl to access
   - **Permissions** → **Repository permissions**:
     - Set **Pull requests** to **Read and write**
4. Click **"Generate token"**
5. Copy the token immediately (you won't see it again!)

---

### Option 2: Classic Personal Access Token

Classic tokens have broader access but are simpler to set up.

**For Public Repositories:**
- ✓ `public_repo` - Access public repositories

**For Private Repositories:**
- ✓ `repo` - Full control of private repositories

**How to Create:**

1. Navigate to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Configure the token:
   - **Note**: `CodeOwl PR Review`
   - **Expiration**: Choose based on your security requirements
   - **Select scopes**:
     - For public repos: Check ✓ `public_repo`
     - For private repos: Check ✓ `repo`
4. Click **"Generate token"**
5. Copy the token immediately (you won't see it again!)

---

## Scope Comparison Table

| Token Type | Scope | Access Level | Use Case | Recommended |
|------------|-------|--------------|----------|-------------|
| Fine-grained | Pull requests: Read and write | Specific repos only | Production use | ✅ Yes |
| Classic | `public_repo` | All public repos | Public repos only | Acceptable |
| Classic | `repo` | All private repos | Private repos | Less secure |

## Configuration

### 1. Create `.env` File

If you haven't already, copy the example environment file:

```bash
cp .env.example .env
```

### 2. Add Your Token

Edit `.env` and add your GitHub token:

```bash
# GitHub API Configuration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_API_BASE_URL=https://api.github.com
```

Replace `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual token.

### 3. Restart the Application

After updating `.env`, restart your development server:

```bash
yarn dev
```

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use fine-grained tokens** when possible for better security
3. **Set token expiration** - Rotate tokens regularly
4. **Limit repository access** - Only grant access to repos you need
5. **Store tokens securely** - Use environment variables or secret managers in production

## Verifying Your Setup

### Test PR Title Fetch

1. Start the application: `yarn dev`
2. Open http://localhost:3000
3. Enter a GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`)
4. Wait ~500ms - the PR title should appear below the URL field

**Success:**
```
┌─────────────────────────────────────┐
│ Pull Request                        │
│ feat: add user authentication       │
└─────────────────────────────────────┘
```

**Error (token not configured):**
```
┌─────────────────────────────────────┐
│ Error                               │
│ GitHub token not configured         │
└─────────────────────────────────────┘
```

### Test Full Review Flow

1. Enter a valid GitHub PR URL
2. Optionally add Jira ticket ID and additional instructions
3. Click **"Start Review"**
4. The app should:
   - ✓ Fetch PR details from GitHub
   - ✓ Analyze code with Claude AI
   - ✓ Post review comments back to the PR

## Troubleshooting

### Error: "GitHub token not configured"

**Cause:** `GITHUB_TOKEN` is not set in `.env`

**Solution:**
1. Create `.env` file if it doesn't exist
2. Add `GITHUB_TOKEN=your_token_here`
3. Restart the dev server

### Error: "Bad credentials" or 401

**Cause:** Invalid or expired token

**Solution:**
1. Generate a new token following the steps above
2. Update `GITHUB_TOKEN` in `.env`
3. Restart the dev server

### Error: "Resource not accessible by personal access token"

**Cause:** Insufficient permissions

**Solution:**
1. For fine-grained tokens: Ensure **Pull requests** is set to **Read and write**
2. For classic tokens: Ensure `public_repo` or `repo` scope is selected
3. Regenerate token with correct permissions

### Error: "Rate limit exceeded"

**Cause:** Too many API requests

**Solution:**
- Authenticated requests have higher rate limits (5,000/hour vs 60/hour)
- Wait for the rate limit to reset
- Check your token is properly configured

## API Rate Limits

| Authentication | Rate Limit | Notes |
|----------------|------------|-------|
| Authenticated | 5,000 requests/hour | With valid token |
| Unauthenticated | 60 requests/hour | Without token |
| Fine-grained token | 5,000 requests/hour | Per repository |

## Additional Resources

- [GitHub Personal Access Tokens Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)

## Need Help?

If you encounter issues not covered here:

1. Check the browser console for detailed error messages
2. Verify your `.env` file is properly configured
3. Ensure your token has the correct permissions
4. Check [GitHub's API status](https://www.githubstatus.com/)
