'use client';

import { useState, useEffect, useRef } from 'react';
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
  CircularProgress,
  Grid,
} from '@mui/material';
import { ModelSelector } from './ModelSelector';
import { ReviewProgress } from './ReviewProgress';
import { ReviewPreviewDialog } from './ReviewPreviewDialog';
import { ReviewStatus, ReviewComment } from '@/types/review';
import { ALL_AI_MODELS } from '@/lib/constants/models';
import { AppConfig } from '@/types/ai';
import { extractJiraTicketFromTitle } from '@/lib/constants/regex';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';


export function ReviewForm() {
  const [prUrl, setPrUrl] = useState('');
  const [jiraTicketId, setJiraTicketId] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [maxTokens, setMaxTokens] = useState<string>('');
  const [modelId, setModelId] = useState(
    process.env.NEXT_PUBLIC_CLAUDE_MODEL_DEFAULT || 'claude-opus-4-5-20251101'
  );
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [error, setError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [prTitle, setPrTitle] = useState<string>();
  const [prTitleLoading, setPrTitleLoading] = useState(false);
  const [reviewId, setReviewId] = useState<string>();

  const [prTitleError, setPrTitleError] = useState<string>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewComments, setPreviewComments] = useState<ReviewComment[]>([]);
  const [previewDiff, setPreviewDiff] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const progressTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isCancelledRef = useRef(false);
  const prUrlDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [config, setConfig] = useState<AppConfig>({
    hasJiraConfig: true,
    hasAnthropicKey: true,
    hasGeminiKey: true,
  });
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch PR title when URL is entered
  const fetchPRTitle = async (url: string) => {
    if (!url) {
      setPrTitle(undefined);
      setPrTitleError(undefined);
      return;
    }

    // Basic validation for GitHub PR URL - supports owner/repo names with letters, numbers, hyphens, underscores, dots
    const githubPRRegex = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i;
    if (!githubPRRegex.test(url)) {
      console.log('PR URL validation failed:', url);
      setPrTitle(undefined);
      setPrTitleError(undefined);
      return;
    }

    console.log('Fetching PR title for:', url);
    try {
      setPrTitleLoading(true);
      setPrTitleError(undefined);
      const response = await fetch(`/api/github/pr?url=${encodeURIComponent(url)}`);

      if (response.ok) {
        const data = await response.json();
        console.log('PR title fetched:', data.title);
        setPrTitle(data.title);
        setPrTitleError(undefined);

        // Auto-fill Jira ticket ID if found in PR title and field is empty
        if (data.title && !jiraTicketId) {
          const extractedJiraId = extractJiraTicketFromTitle(data.title);
          if (extractedJiraId) {
            console.log('Auto-filled Jira ticket ID:', extractedJiraId);
            setJiraTicketId(extractedJiraId);
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch PR title:', response.status, errorData);
        setPrTitle(undefined);
        setPrTitleError(errorData.error || 'Failed to fetch PR details');
      }
    } catch (err) {
      console.error('Error fetching PR title:', err);
      setPrTitle(undefined);
      setPrTitleError('Network error while fetching PR details');
    } finally {
      setPrTitleLoading(false);
    }
  };

  // Clear error when user modifies inputs
  const handleInputChange = (field: 'prUrl' | 'jiraTicketId' | 'additionalPrompt' | 'maxTokens', value: string) => {
    if (error) {
      setError(undefined);
    }

    switch (field) {
      case 'prUrl':
        setPrUrl(value);

        // Debounce PR title fetch
        if (prUrlDebounceRef.current) {
          clearTimeout(prUrlDebounceRef.current);
        }
        prUrlDebounceRef.current = setTimeout(() => {
          fetchPRTitle(value);
        }, 500);
        break;
      case 'jiraTicketId':
        setJiraTicketId(value);
        break;
      case 'additionalPrompt':
        setAdditionalPrompt(value);
        break;
      case 'maxTokens':
        // Only allow numeric input
        if (value === '' || /^\d+$/.test(value)) {
          setMaxTokens(value);
        }
        break;
    }
  };

  // Clear all progress timeouts
  const clearProgressTimeouts = () => {
    progressTimeoutsRef.current.forEach(clearTimeout);
    progressTimeoutsRef.current = [];
    isCancelledRef.current = true;
  };

  // Fetch app configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (err) {
        console.error('Failed to fetch config:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearProgressTimeouts();
    };
  }, []);

  const handleReset = () => {
    setPrUrl('');
    setJiraTicketId('');
    setAdditionalPrompt('');
    setMaxTokens('');
    setError(undefined);
    setSuccessMessage(undefined);
    setPrTitle(undefined);
    setPrTitleError(undefined);
    setStatus('idle');
    setReviewId(undefined);
    clearProgressTimeouts();
    if (prUrlDebounceRef.current) {
      clearTimeout(prUrlDebounceRef.current);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prUrl) {
      setError('Please enter a GitHub PR URL');
      return;
    }

    setStatus('fetching-github');
    setError(undefined);
    setSuccessMessage(undefined);
    clearProgressTimeouts();
    isCancelledRef.current = false;

    // Schedule simulated progress updates with cancellation check
    const timeouts = [
      setTimeout(() => {
        if (!isCancelledRef.current) setStatus('fetching-jira');
      }, 1000),
      setTimeout(() => {
        if (!isCancelledRef.current) setStatus('ai-review');
      }, 2000),
    ];
    progressTimeoutsRef.current = timeouts;

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prUrl,
          jiraTicketId: jiraTicketId || undefined,
          additionalPrompt: additionalPrompt || undefined,
          maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
          modelId,
          previewOnly: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Parse error to identify which service failed
        let errorMessage = data.error || 'Failed to submit review';

        if (data.steps) {
          const failedStep = Object.entries(data.steps).find(
            ([_, step]: [string, any]) => step.success === false && step.error
          );

          if (failedStep) {
            const [stepName, stepData] = failedStep;
            const serviceMap: Record<string, string> = {
              fetchGitHub: 'GitHub',
              fetchJira: 'Jira',
              aiReview: 'Claude AI',
              postGitHubComments: 'GitHub Comments',
              postJiraComment: 'Jira Comment',
            };

            const serviceName = serviceMap[stepName] || stepName;
            errorMessage = `${serviceName}: ${(stepData as any).error}`;
          }
        }

        throw new Error(errorMessage);
      }

      if (data.preview) {
        setPreviewComments(data.comments);
        setPreviewDiff(data.diff || '');
        setReviewId(data.reviewId);
        setPreviewOpen(true);
        setStatus('approval'); // Update status to approval
      } else {
        clearProgressTimeouts();
        setStatus('success');
        setSuccessMessage(`Review completed! Posted ${data.commentsCount} comments to PR.`);

        // Reset form after success
        setTimeout(() => {
          setPrUrl('');
          setJiraTicketId('');
          setAdditionalPrompt('');
          setMaxTokens('');
          setStatus('idle');
        }, 5000);
      }
    } catch (err) {
      clearProgressTimeouts();
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleApproveReview = async (comments: ReviewComment[]) => {
    setIsSubmittingReview(true);
    setStatus('posting-comments'); // Update status to posting
    try {
      const response = await fetch('/api/review/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          prUrl,
          jiraTicketId: jiraTicketId || undefined,
          modelId,
          comments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setPreviewOpen(false);
      setStatus('success');
      setSuccessMessage(`Review completed! Posted ${data.commentsCount} comments to PR.`);

      // Reset form after success
      setTimeout(() => {
        setPrUrl('');
        setJiraTicketId('');
        setAdditionalPrompt('');
        setMaxTokens('');
        setStatus('idle');
        setSuccessMessage(undefined);
      }, 5000);
    } catch (err) {
      console.error('Submit error:', err);
      // Don't close dialog on error so user can try again
      alert(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <Box>
      <ReviewPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onApprove={handleApproveReview}
        onReject={() => {
          setPreviewOpen(false);
          setStatus('idle');
        }}
        comments={previewComments}
        diff={previewDiff}
        prTitle={prTitle || 'Pull Request'}
        prUrl={prUrl}
        modelName={ALL_AI_MODELS.find((m) => m.id === modelId)?.name || modelId}
        isSubmitting={isSubmittingReview}
      />
      {/* Header Section */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                background: '#ffffff',
                boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
              }}
            >
              <img src="/icon.png" alt="Code Tanuki" width={40} height={40} />
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
              <Box>
                <TextField
                  label="GitHub PR URL"
                  placeholder="https://github.com/owner/repo/pull/123"
                  value={prUrl}
                  onChange={(e) => handleInputChange('prUrl', e.target.value)}
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
                {prTitleLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <CircularProgress size={16} sx={{ color: '#667eea' }} />
                    <Typography variant="caption" color="text.secondary">
                      Fetching PR details...
                    </Typography>
                  </Box>
                )}
                {prTitle && !prTitleLoading && (
                  <Fade in>
                    <Box
                      sx={{
                        mt: 1,
                        p: 1.5,
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                        border: '1px solid rgba(102, 126, 234, 0.2)',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#667eea', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Pull Request
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        {prTitle}
                      </Typography>
                    </Box>
                  </Fade>
                )}
                {prTitleError && !prTitleLoading && (
                  <Fade in>
                    <Box
                      sx={{
                        mt: 1,
                        p: 1.5,
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Error
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#991b1b' }}>
                        {prTitleError}
                      </Typography>
                    </Box>
                  </Fade>
                )}
              </Box>

              <Box>
                <TextField
                  label="Jira Ticket ID (Optional)"
                  placeholder="BYD-1234"
                  value={jiraTicketId}
                  onChange={(e) => handleInputChange('jiraTicketId', e.target.value)}
                  fullWidth
                  disabled={status !== 'idle' || !config.hasJiraConfig}
                  helperText={
                    !config.hasJiraConfig && !configLoading
                      ? 'Jira integration not configured'
                      : 'Auto-extracted from PR title or enter manually'
                  }
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
              </Box>

              <TextField
                label="Additional Instructions (Optional)"
                placeholder="Focus on security, performance, best practices..."
                value={additionalPrompt}
                onChange={(e) => handleInputChange('additionalPrompt', e.target.value)}
                fullWidth
                multiline
                rows={4}
                disabled={status !== 'idle'}
                helperText="Max 2000 characters"
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <ModelSelector
                    value={modelId}
                    onChange={setModelId}
                    config={config}
                    configLoading={configLoading}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Max Tokens"
                    placeholder="e.g. 4096"
                    value={maxTokens}
                    onChange={(e) => handleInputChange('maxTokens', e.target.value)}
                    disabled={status !== 'idle'}
                    helperText="Output limit"
                    fullWidth
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={status !== 'idle'}
                  fullWidth
                  startIcon={<RocketLaunchIcon />}
                  sx={{
                    py: 1.5,
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

                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  disabled={status !== 'idle' && status !== 'error'}
                  onClick={handleReset}
                  startIcon={<RestartAltIcon />}
                  sx={{
                    py: 1.5,
                    borderColor: '#667eea',
                    color: '#667eea',
                    '&:hover': {
                      borderColor: '#764ba2',
                      backgroundColor: 'rgba(102, 126, 234, 0.04)',
                    },
                  }}
                >
                  Reset
                </Button>
              </Stack>
            </Box>

            {/* Security Notice */}
            <Alert
              severity="info"
              icon={<LockOutlinedIcon />}
              sx={{
                mt: 4,
                bgcolor: 'rgba(102, 126, 234, 0.05)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                '& .MuiAlert-message': { width: '100%' }
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Data Privacy & Security
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your code review data are stored locally on this server for history and debugging purposes.
                  Data is transmitted securely to your configured AI provider. Review the <strong>History</strong> page to manage stored reviews.
                </Typography>
              </Box>
            </Alert>

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
