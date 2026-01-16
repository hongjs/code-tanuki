# Jira API Setup Guide

This document explains how to configure Jira API access for CodeOwl's ticket integration functionality.

## Overview

Jira integration in CodeOwl is **optional** but recommended. It allows the tool to:

- Fetch ticket details (summary, description, acceptance criteria)
- Validate PR implementation against requirements
- Post review completion status as comments on Jira tickets

## Required Jira API Operations

CodeOwl uses the following Jira REST API operations:

- **`GET /rest/api/3/issue/{ticketId}`** - Fetch issue details
  - Summary, description, acceptance criteria
  - Status, type, priority
  - Assignee information
- **`POST /rest/api/3/issue/{ticketId}/comment`** - Add comments to issues
  - Post review completion status
  - Include PR link and comment count

## Minimum Required Permissions

Jira API tokens are **account-based** and inherit your user permissions. The minimum permissions your Jira account needs:

### For Jira Cloud (Atlassian Cloud)

**Project Permissions:**
- ✓ **Browse Projects** - View issues in the project
- ✓ **Add Comments** - Add comments to issues

**Issue-Level Access:**
- Your account must have access to view the specific issues/tickets
- Typically granted through project membership or role assignment

### Permission Verification

To verify your account has the required permissions:

1. Log into your Jira instance
2. Try to view a ticket in the target project
3. Try to add a comment to that ticket
4. If both work, you have sufficient permissions

## Creating a Jira API Token

### Jira Cloud (Atlassian Cloud)

1. **Navigate to API Token Management**
   - Go to: https://id.atlassian.com/manage-profile/security/api-tokens
   - Or: Atlassian Account → Security → API tokens

2. **Create API Token**
   - Click **"Create API token"**
   - Enter a label: `CodeOwl PR Review Tool`
   - Click **"Create"**

3. **Copy the Token**
   - Copy the token immediately (you won't see it again!)
   - Store it securely

4. **Token Characteristics**
   - Tokens inherit your account permissions
   - Tokens don't expire automatically
   - Can be revoked at any time

### Jira Server/Data Center

For self-hosted Jira instances:

1. **Navigate to Personal Access Tokens**
   - Go to: Your Jira URL → Profile → Personal Access Tokens
   - Or ask your Jira admin for the token creation page

2. **Create Token**
   - Click **"Create token"**
   - Name: `CodeOwl PR Review`
   - Expiry: Choose based on security policy

3. **Copy and Store**
   - Copy the token immediately
   - Store it securely

## Configuration

### 1. Get Your Jira Information

You'll need three pieces of information:

**a) Jira Base URL**
- Jira Cloud: `https://your-domain.atlassian.net`
- Jira Server: `https://jira.yourcompany.com`

**b) Your Jira Email**
- The email address associated with your Jira account
- Example: `john.doe@company.com`

**c) Your API Token**
- The token you created in the previous step

### 2. Update `.env` File

Edit your `.env` file and add the Jira configuration:

```bash
# Jira API Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_api_token_here
```

**Important Notes:**
- `JIRA_BASE_URL` should NOT end with a trailing slash
- Use the email address you log into Jira with
- Keep the API token secret and never commit it to version control

### 3. Restart the Application

After updating `.env`, restart your development server:

```bash
yarn dev
```

## Verifying Your Setup

### Test Jira Integration

1. Start the application: `yarn dev`
2. Open http://localhost:3000
3. Enter a GitHub PR URL with a Jira ticket ID in the title
   - Example: `feat(PROJ-123): Add user authentication`
4. Or manually enter a Jira ticket ID in the form
5. Click **"Start Review"**

**Expected Behavior:**

✅ **Success:**
```
Step: Fetch Jira Ticket ✓
- Successfully fetched ticket PROJ-123
- Ticket included in AI review context
- Review completion comment posted to Jira
```

❌ **Error (invalid token):**
```
Jira: Failed to fetch ticket: Authentication failed
```

❌ **Error (insufficient permissions):**
```
Jira: Failed to fetch ticket: You do not have permission to view this issue
```

### Check Jira for Review Comment

After a successful review:

1. Go to the Jira ticket
2. Scroll to **Comments** section
3. You should see a comment like:

```
✅ AI Review completed: https://github.com/owner/repo/pull/123
Posted 5 review comments.
```

## Jira Ticket ID Extraction

CodeOwl automatically extracts Jira ticket IDs from PR titles using these patterns:

### Supported Formats

```
feat(PROJ-123): Add new feature          → PROJ-123
fix(BYD-456): Fix authentication bug      → BYD-456
chore(TEAM-789): Update dependencies      → TEAM-789
docs(DOC-001): Update README              → DOC-001
```

**Supported Prefixes:**
- `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `perf`

**Ticket ID Format:**
- 2-10 uppercase letters
- Hyphen
- 1-6 digits
- Examples: `ABC-1`, `PROJECT-1234`, `TEAM-999999`

### Manual Override

You can also manually enter a Jira ticket ID in the form, which overrides auto-extraction.

## Troubleshooting

### Error: "Failed to fetch ticket: Authentication failed"

**Cause:** Invalid credentials

**Solution:**
1. Verify `JIRA_EMAIL` matches your Jira account email
2. Verify `JIRA_API_TOKEN` is correct (regenerate if needed)
3. Check `JIRA_BASE_URL` is correct (no trailing slash)
4. Restart the dev server

### Error: "You do not have permission to view this issue"

**Cause:** Insufficient permissions

**Solution:**
1. Verify you can manually view the ticket in Jira
2. Ask your Jira admin to grant you project access
3. Ensure you're a member of the project

### Error: "Issue does not exist"

**Cause:** Ticket ID not found or deleted

**Solution:**
1. Verify the ticket ID is correct
2. Check the ticket exists in Jira
3. Ensure you're using the right Jira instance

### Error: "Failed to post comment: Add Comments permission needed"

**Cause:** Missing comment permission

**Solution:**
1. Ask your Jira admin to grant "Add Comments" permission
2. Verify you can manually comment on tickets

### Jira Integration Disabled

If Jira is not configured:
- CodeOwl will skip Jira ticket fetching
- Reviews will proceed without ticket context
- No comments will be posted to Jira
- This is completely fine for GitHub-only workflows

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Rotate tokens periodically** - Create new tokens every 90 days
3. **Revoke unused tokens** - Remove old tokens from Atlassian account
4. **Use least-privilege accounts** - Don't use admin accounts for API access
5. **Monitor token usage** - Check Atlassian account for suspicious activity
6. **Store securely in production** - Use secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)

## Jira API Rate Limits

### Jira Cloud

- **Rate limits vary by plan:**
  - Free: Lower limits
  - Standard: ~1000 requests/minute
  - Premium: ~2000 requests/minute
  - Enterprise: Custom limits

- **Per-user limits:** API tokens have same limits as user actions
- **Backoff:** CodeOwl implements automatic retry with exponential backoff

### Jira Server/Data Center

- Rate limits configured by administrators
- Typically higher than Cloud limits
- Check with your Jira admin

## Optional: Making Jira Integration Optional

The current implementation treats Jira as optional:

1. If `JIRA_BASE_URL`, `JIRA_EMAIL`, or `JIRA_API_TOKEN` are not set, Jira integration is skipped
2. If a Jira ticket fetch fails, the review continues without it
3. The review uses only GitHub PR information

This allows you to:
- Use CodeOwl without Jira
- Run reviews even if Jira is temporarily unavailable
- Gradually roll out Jira integration

## Fields Fetched from Jira

CodeOwl fetches the following fields from Jira tickets:

| Field | API Field | Used For |
|-------|-----------|----------|
| Ticket Key | `key` | Identification |
| Summary | `fields.summary` | Requirements context |
| Description | `fields.description` | Detailed requirements |
| Acceptance Criteria | `fields.description` (extracted) | Validation criteria |
| Status | `fields.status.name` | Ticket state |
| Type | `fields.issuetype.name` | Context (bug, story, etc.) |
| Priority | `fields.priority.name` | Review prioritization |
| Assignee | `fields.assignee` | Developer context |

These fields are included in the AI review prompt to help Claude understand requirements and validate implementation.

## Additional Resources

- [Atlassian API Tokens Documentation](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
- [Jira Cloud REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Jira Permissions Overview](https://support.atlassian.com/jira-cloud-administration/docs/manage-project-permissions/)
- [Jira API Rate Limiting](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/)

## Need Help?

If you encounter issues not covered here:

1. Check the browser console for detailed error messages
2. Verify your Jira credentials in `.env`
3. Test access by manually viewing/commenting on the ticket in Jira
4. Check Jira API status: https://status.atlassian.com/
5. Open an issue: https://github.com/hongjs/codeowl/issues
