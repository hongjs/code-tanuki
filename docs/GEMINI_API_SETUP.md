# Gemini API Setup Guide

This guide will help you configure the Gemini AI integration for CodeOwl.

## Prerequisites

- A Google Cloud account
- Access to Google AI Studio or Vertex AI

## Getting Your Gemini API Key

### Option 1: Google AI Studio (Recommended for Development)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click on "Get API key" in the left sidebar
4. Click "Create API key"
5. Choose a Google Cloud project (or create a new one)
6. Copy the generated API key

### Option 2: Vertex AI (Recommended for Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Vertex AI API
3. Navigate to APIs & Services > Credentials
4. Create an API key or use a service account

## Configuration

Add the following to your `.env.local` file:

```env
# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL_DEFAULT=gemini-2.0-flash
GEMINI_MAX_TOKENS=4096
GEMINI_TEMPERATURE=0.3
```

## Available Gemini Models

| Model ID                | Name                  | Description                     | Best For              |
| ----------------------- | --------------------- | ------------------------------- | --------------------- |
| `gemini-2.0-flash`      | Gemini 2.0 Flash      | Latest and fastest Gemini model | General code reviews  |
| `gemini-2.0-flash-lite` | Gemini 2.0 Flash Lite | Lightweight, cost-efficient     | Simple, quick reviews |
| `gemini-1.5-pro`        | Gemini 1.5 Pro        | Best for complex reasoning      | Complex code analysis |
| `gemini-1.5-flash`      | Gemini 1.5 Flash      | Fast and versatile              | Balanced reviews      |

## Model Selection

When starting a new code review, you can select your preferred AI provider and model from the dropdown:

- **Claude (Anthropic)**: Best for nuanced, detailed code reviews
- **Gemini (Google)**: Best for fast, cost-effective analysis

## Pricing

Gemini models generally offer competitive pricing. Check [Google AI pricing](https://ai.google.dev/pricing) for current rates.

## Troubleshooting

### Invalid API Key

If you see an authentication error:

1. Verify your API key is correct
2. Check that the Generative AI API is enabled in your Google Cloud project
3. Ensure your API key has the necessary permissions

### Rate Limits

If you encounter rate limiting:

1. Add delays between requests
2. Consider upgrading your quota
3. Use a different model with higher limits

### Model Not Available

If a model is not available:

1. Check that you have access to the model in your region
2. Verify the model ID is correct
3. Some models may require specific permissions or agreements

## Security Best Practices

1. **Never commit API keys** to version control
2. Use environment variables for all sensitive configuration
3. Rotate API keys periodically
4. Use separate API keys for development and production
5. Set up billing alerts in Google Cloud Console
