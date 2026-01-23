# Claude API Setup Guide

This document explains how to configure Anthropic's Claude API access for Code-Tanuki's AI-powered code review functionality.

## Overview

Claude API (Anthropic) is the **core requirement** for Code-Tanuki. It powers the AI code review functionality that analyzes pull requests and provides intelligent feedback.

## Required Claude API Operations

Code-Tanuki uses the following Anthropic API operations:

- **`messages.create()`** - Generate AI code reviews
  - Analyzes PR diffs
  - Reviews code against requirements
  - Generates inline review comments
  - Supports multiple Claude models (Opus, Sonnet, Haiku)

## API Key Types and Access

Unlike GitHub's fine-grained permissions, Anthropic API keys provide **full access** to the API with the following characteristics:

### API Key Characteristics

- **No granular scopes** - Keys have full API access
- **Organization-based** - Keys belong to a specific organization/workspace
- **Usage-based billing** - Charged based on tokens consumed
- **Rate limits** - Based on your organization's tier
- **Format** - Always starts with `sk-ant-`

### Access Levels

| Tier       | Rate Limit           | Use Case                   |
| ---------- | -------------------- | -------------------------- |
| Free Trial | Limited requests/day | Testing & evaluation       |
| Build Plan | 50 requests/min      | Development & small teams  |
| Scale Plan | 1,000 requests/min   | Production & growing teams |
| Enterprise | Custom limits        | Large organizations        |

**Note:** There is no concept of "minimum scope" for Claude API keys - a key either has full access or no access. Access control is managed at the organization level in Anthropic Console.

## Creating an Anthropic API Key

### Step 1: Create an Anthropic Account

1. **Navigate to Anthropic Console**
   - Go to: https://console.anthropic.com/

2. **Sign Up**
   - Click **"Sign Up"** or **"Get Started"**
   - Use your email or Google account
   - Verify your email address

3. **Complete Organization Setup**
   - Create or join an organization
   - Add billing information (required for production use)

### Step 2: Generate API Key

1. **Navigate to API Keys**
   - Go to: https://console.anthropic.com/settings/keys
   - Or: Dashboard → Settings → API Keys

2. **Create New Key**
   - Click **"Create Key"**
   - Enter a name: `Code-Tanuki PR Review Tool`
   - Click **"Create Key"**

3. **Copy the Key**
   - Copy the key immediately (starts with `sk-ant-`)
   - You won't be able to see it again!
   - Store it securely

4. **Key Management**
   - Keys don't expire automatically
   - Can be revoked at any time
   - Track usage in the Console

### Step 3: Add Credits (If Required)

For production use:

1. Navigate to **Billing** in Console
2. Add payment method
3. Purchase credits or set up auto-recharge
4. Monitor usage regularly

## Supported Models in Code-Tanuki

Code-Tanuki supports three Claude 4 models with different performance characteristics:

| Model        | ID                         | Description  | Max Tokens | Best For                       | Cost    |
| ------------ | -------------------------- | ------------ | ---------- | ------------------------------ | ------- |
| **Opus 4**   | `claude-opus-4-20250514`   | Most capable | 8,192      | Complex reviews, critical code | Highest |
| **Sonnet 4** | `claude-sonnet-4-20250514` | Balanced     | 8,192      | Most use cases                 | Medium  |
| **Haiku 4**  | `claude-haiku-4-20250514`  | Fastest      | 8,192      | Simple reviews, quick feedback | Lowest  |

### Model Selection Guide

**Use Opus 4 when:**

- Reviewing complex architectural changes
- Security-critical code
- Performance-sensitive algorithms
- Need highest quality analysis

**Use Sonnet 4 when:**

- General code reviews (recommended default)
- Balanced cost and quality
- Most feature implementations

**Use Haiku 4 when:**

- Simple bug fixes
- Documentation changes
- Quick reviews needed
- Cost optimization important

## Configuration

### 1. Update `.env` File

Edit your `.env` file and add your Anthropic API key:

```bash
# Claude API Configuration (Required)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Claude Model Configuration (Optional)
CLAUDE_MODEL_DEFAULT=claude-opus-4-20250514
CLAUDE_MAX_TOKENS=8192
CLAUDE_TEMPERATURE=0.3
```

### Configuration Variables Explained

| Variable               | Required | Default                  | Description                          |
| ---------------------- | -------- | ------------------------ | ------------------------------------ |
| `ANTHROPIC_API_KEY`    | ✅ Yes   | -                        | Your API key (starts with `sk-ant-`) |
| `CLAUDE_MODEL_DEFAULT` | No       | `claude-opus-4-20250514` | Default model for reviews            |
| `CLAUDE_MAX_TOKENS`    | No       | `8192`                   | Maximum output tokens                |
| `CLAUDE_TEMPERATURE`   | No       | `0.3`                    | Model creativity (0.0-1.0)           |

**Temperature Guide:**

- `0.0` - Most deterministic, consistent
- `0.3` - Recommended for code review (default)
- `1.0` - Most creative, varied

### 2. Restart the Application

After updating `.env`, restart your development server:

```bash
yarn dev
```

## Verifying Your Setup

### Test Claude API Connection

1. Start the application: `yarn dev`
2. Open http://localhost:3000
3. Enter a GitHub PR URL
4. Click **"Start Review"**

**Expected Behavior:**

✅ **Success:**

```
Step: AI Analysis ✓
- Claude model: claude-opus-4-20250514
- Generated 5 review comments
- Tokens used: Input 2,453 | Output 876
```

❌ **Error (key not configured):**

```
Claude AI: ANTHROPIC_API_KEY is not configured. Please set it in your .env file.
```

❌ **Error (invalid key):**

```
Claude AI: Invalid ANTHROPIC_API_KEY. Please check your API key in the .env file.
```

❌ **Error (insufficient credits):**

```
Claude AI: Insufficient credits. Please add credits to your Anthropic account.
```

## Rate Limits and Quotas

### Request Limits

| Tier       | Requests/Min | Tokens/Min | Daily Limit |
| ---------- | ------------ | ---------- | ----------- |
| Free Trial | 5            | 10,000     | Limited     |
| Build      | 50           | 40,000     | Unlimited   |
| Scale      | 1,000        | 400,000    | Unlimited   |
| Enterprise | Custom       | Custom     | Custom      |

### Token Limits

Claude API has two token limits:

1. **Input tokens** - The PR diff + context sent to Claude
2. **Output tokens** - The review comments generated
3. **Combined limit** - Varies by model (typically 200k context window)

**Code-Tanuki's Token Usage:**

- Small PR (~100 lines): ~2,000 input + ~500 output = 2,500 total
- Medium PR (~500 lines): ~8,000 input + ~1,500 output = 9,500 total
- Large PR (~1,000 lines): ~15,000 input + ~3,000 output = 18,000 total

### Monitoring Usage

1. Go to: https://console.anthropic.com/settings/usage
2. View real-time usage statistics
3. Set up billing alerts
4. Track costs per model

## Pricing (Approximate)

| Model    | Input (per 1M tokens) | Output (per 1M tokens) |
| -------- | --------------------- | ---------------------- |
| Opus 4   | $15                   | $75                    |
| Sonnet 4 | $3                    | $15                    |
| Haiku 4  | $0.25                 | $1.25                  |

**Example Cost Calculation:**

Medium PR (500 lines) with Sonnet 4:

- Input: 8,000 tokens × $3/1M = $0.024
- Output: 1,500 tokens × $15/1M = $0.023
- **Total: ~$0.05 per review**

_Prices are approximate and subject to change. Check [Anthropic Pricing](https://www.anthropic.com/pricing) for current rates._

## Troubleshooting

### Error: "ANTHROPIC_API_KEY is not configured"

**Cause:** API key not set in `.env`

**Solution:**

1. Create or edit `.env` file
2. Add `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart dev server

### Error: "Invalid ANTHROPIC_API_KEY format"

**Cause:** API key doesn't start with `sk-ant-`

**Solution:**

1. Verify you copied the complete key
2. Check for extra spaces or characters
3. Regenerate key if needed

### Error: "Authentication failed"

**Cause:** Invalid or revoked API key

**Solution:**

1. Verify key is active in Console
2. Generate a new key
3. Update `.env` with new key
4. Restart dev server

### Error: "Rate limit exceeded"

**Cause:** Too many requests

**Solution:**

1. Wait for rate limit to reset (usually 1 minute)
2. Upgrade to higher tier if needed
3. Reduce review frequency
4. Implement request queuing

### Error: "Insufficient credits"

**Cause:** No credits remaining

**Solution:**

1. Add credits in Console
2. Set up auto-recharge
3. Check billing settings

### Error: "Model not found" or "Invalid model"

**Cause:** Model ID incorrect or model not available

**Solution:**

1. Verify model ID in `CLAUDE_MODEL_DEFAULT`
2. Use one of the supported models:
   - `claude-opus-4-20250514`
   - `claude-sonnet-4-20250514`
   - `claude-haiku-4-20250514`
3. Check Anthropic docs for model availability

### Slow Response Times

**Cause:** Model processing time or network latency

**Solution:**

1. Use faster models (Haiku 4) for quick reviews
2. Reduce `CLAUDE_MAX_TOKENS` if reviews are too long
3. Check your internet connection
4. Monitor API status: https://status.anthropic.com/

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Rotate keys periodically** - Create new keys every 90 days
3. **Revoke unused keys** - Remove old keys from Console
4. **Monitor usage** - Set up billing alerts for unexpected spikes
5. **Use environment variables** - Never hardcode keys in code
6. **Store securely in production** - Use secret managers (AWS Secrets Manager, etc.)
7. **Limit key access** - Don't share keys across projects
8. **Review usage logs** - Check Console for suspicious activity

## Cost Optimization Tips

1. **Choose the right model:**
   - Use Haiku 4 for simple reviews
   - Reserve Opus 4 for critical code

2. **Optimize token usage:**
   - Reduce `CLAUDE_MAX_TOKENS` if reviews are too verbose
   - Focus reviews on changed files only (already implemented)

3. **Implement caching:**
   - Use duplicate review prevention (already implemented)
   - Cache common responses

4. **Set budgets:**
   - Configure billing alerts in Console
   - Set monthly spending limits

5. **Monitor usage:**
   - Review usage patterns weekly
   - Identify and eliminate waste

## API Features Used by Code-Tanuki

### Messages API

```typescript
await client.messages.create({
  model: 'claude-opus-4-20250514',
  max_tokens: 8192,
  temperature: 0.3,
  system: '<system prompt for code review>',
  messages: [
    {
      role: 'user',
      content: '<PR diff and context>',
    },
  ],
});
```

### Response Format

Claude returns JSON with review comments:

```json
{
  "comments": [
    {
      "path": "src/auth.ts",
      "line": 42,
      "severity": "critical",
      "body": "SQL injection vulnerability detected..."
    }
  ]
}
```

## Additional Resources

- [Anthropic Console](https://console.anthropic.com/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Pricing Information](https://www.anthropic.com/pricing)
- [API Status Page](https://status.anthropic.com/)
- [Community Support](https://community.anthropic.com/)
- [Rate Limits Guide](https://docs.anthropic.com/claude/reference/rate-limits)

## Comparing with Other Providers

If you're evaluating Claude against other AI providers:

| Feature             | Claude (Anthropic) | GPT-4 (OpenAI) | Gemini (Google) |
| ------------------- | ------------------ | -------------- | --------------- |
| Code review quality | Excellent          | Excellent      | Good            |
| Context window      | 200k tokens        | 128k tokens    | 1M tokens       |
| Response speed      | Fast               | Fast           | Very fast       |
| Pricing             | Competitive        | Higher         | Lower           |
| JSON mode           | Yes                | Yes            | Yes             |
| Function calling    | Yes                | Yes            | Yes             |

**Why Claude for Code-Tanuki:**

- Excellent code understanding
- Strong reasoning capabilities
- Reliable JSON output
- Good balance of cost/quality
- Great for security analysis

## Need Help?

If you encounter issues not covered here:

1. Check the browser console for detailed error messages
2. Verify your `.env` file configuration
3. Check API key in Anthropic Console
4. Review API status: https://status.anthropic.com/
5. Check usage and credits in Console
6. Open an issue: https://github.com/hongjs/code-tanuki/issues
7. Contact Anthropic support: https://support.anthropic.com/
