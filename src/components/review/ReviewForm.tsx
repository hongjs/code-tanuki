'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  Link as MuiLink,
  Fade,
  Grow,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
} from '@mui/material';
import { ModelSelector } from './ModelSelector';
import { ReviewProgress } from './ReviewProgress';
import { ReviewStatus } from '@/types/review';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';

export function ReviewForm() {
  const [prUrl, setPrUrl] = useState('');
  const [jiraTicketId, setJiraTicketId] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [modelId, setModelId] = useState(
    process.env.NEXT_PUBLIC_CLAUDE_MODEL_DEFAULT || 'claude-opus-4-20250514'
  );
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [error, setError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prUrl) {
      setError('Please enter a GitHub PR URL');
      return;
    }

    setStatus('fetching-github');
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      // Simulate progress through steps
      setTimeout(() => setStatus('fetching-jira'), 1000);
      setTimeout(() => setStatus('ai-review'), 2000);
      setTimeout(() => setStatus('posting-comments'), 5000);

      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prUrl,
          jiraTicketId: jiraTicketId || undefined,
          additionalPrompt: additionalPrompt || undefined,
          modelId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setStatus('success');
      setSuccessMessage(`Review completed! Posted ${data.commentsCount} comments to PR.`);

      // Reset form after success
      setTimeout(() => {
        setPrUrl('');
        setJiraTicketId('');
        setAdditionalPrompt('');
        setStatus('idle');
      }, 5000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <Box>
      {/* Header Section */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                }}
              >
                AI-Powered Code Review
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Let AI analyze your pull requests and provide intelligent feedback
              </Typography>
            </Box>
          </Box>

          {/* Feature Pills */}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip
              icon={<SpeedIcon />}
              label="Fast Analysis"
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                fontWeight: 600,
              }}
            />
            <Chip
              icon={<SecurityIcon />}
              label="Security Focused"
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                fontWeight: 600,
              }}
            />
            <Chip
              icon={<AutoAwesomeIcon />}
              label="AI-Powered"
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Stack>
        </Box>
      </Fade>

      {/* Main Form Card */}
      <Grow in timeout={800}>
        <Card
          elevation={0}
          sx={{
            background: 'white',
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            },
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
            >
              <TextField
                label="GitHub PR URL"
                placeholder="https://github.com/owner/repo/pull/123"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                required
                fullWidth
                disabled={status !== 'idle'}
                InputProps={{
                  sx: {
                    '&:hover': {
                      '& fieldset': {
                        borderColor: '#667eea !important',
                      },
                    },
                  },
                }}
              />

              <TextField
                label="Jira Ticket ID (Optional)"
                placeholder="BYD-1234"
                value={jiraTicketId}
                onChange={(e) => setJiraTicketId(e.target.value)}
                fullWidth
                disabled={status !== 'idle'}
                helperText="Leave empty to auto-extract from PR title"
              />

              <TextField
                label="Additional Instructions (Optional)"
                placeholder="Focus on security, performance, best practices..."
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                fullWidth
                multiline
                rows={4}
                disabled={status !== 'idle'}
                helperText="Max 2000 characters"
              />

              <ModelSelector value={modelId} onChange={setModelId} />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={status !== 'idle'}
                fullWidth
                startIcon={<RocketLaunchIcon />}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    transition: 'left 0.5s',
                  },
                  '&:hover::before': {
                    left: '100%',
                  },
                }}
              >
                {status !== 'idle' && status !== 'success' ? 'Reviewing...' : 'Start Review'}
              </Button>
            </Box>

            <ReviewProgress status={status} error={error} />

            {successMessage && (
              <Fade in>
                <Alert
                  severity="success"
                  sx={{
                    mt: 3,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {successMessage}
                  <MuiLink
                    href={prUrl}
                    target="_blank"
                    rel="noopener"
                    sx={{
                      ml: 1,
                      fontWeight: 600,
                      color: '#059669',
                    }}
                  >
                    View PR →
                  </MuiLink>
                </Alert>
              </Fade>
            )}
          </CardContent>
        </Card>
      </Grow>
    </Box>
  );
}
