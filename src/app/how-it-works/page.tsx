'use client';

import {
  Box,
  Typography,
  Paper,
  Container,
  Grid,
  Step,
  Stepper,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Avatar,
  Fade,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';

const steps = [
  {
    label: 'Connect & Fetch',
    description: 'Paste your GitHub Pull Request URL. Code Tanuki fetches the PR diff and optionally retrieves linked Jira ticket details (Acceptance Criteria, Summary) for better context.',
    icon: <GitHubIcon />,
    color: '#24292e',
  },
  {
    label: 'AI Analysis',
    description: 'Your selected AI model (Claude 4.5 or Gemini 3) analyzes the code changes against the PR description and Jira acceptance criteria to find bugs and logic errors.',
    icon: <SmartToyIcon />,
    color: '#667eea',
  },
  {
    label: 'Review Preview',
    description: 'Review the AI-generated suggestions in an interactive dashboard. Edit, delete, or refine the comments before they go public.',
    icon: <RateReviewIcon />,
    color: '#f59e0b',
  },
  {
    label: 'Publish & Sync',
    description: 'Once approved, comments are posted to GitHub. A summary comment is also synced to the connected Jira ticket, keeping your project management tools up to date.',
    icon: <CheckCircleIcon />,
    color: '#10b981',
  },
];

import { MainLayout } from '@/components/layout/MainLayout';

export default function HowItWorksPage() {
  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Fade in timeout={800}>
          <Box sx={{ mb: 8, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              How Code Tanuki Works
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Automate your code reviews with AI-powered insights in 4 simple steps
            </Typography>
          </Box>
        </Fade>

        <Grid container spacing={6}>
          {/* Left Side: Vertical Stepper */}
          <Grid item xs={12} md={6}>
            <Stepper orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label} active expanded>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          bgcolor: step.color,
                          width: 40,
                          height: 40,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        }}
                      >
                        {step.icon}
                      </Avatar>
                    )}
                  >
                    <Typography variant="h6" fontWeight={700}>
                      {step.label}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Box sx={{ mb: 4, ml: 1, pl: 3, borderLeft: '2px dashed #e0e0e0' }}>
                      <Typography>{step.description}</Typography>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Grid>

          {/* Right Side: Features/Benefits */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
               <Card
                sx={{
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #fff 0%, #f9f9f9 100%)',
                  border: '1px solid #eee',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                }}
              >
                <CardContent sx={{ p: 4, display: 'flex', gap: 3 }}>
                  <Avatar sx={{ bgcolor: 'rgba(102, 126, 234, 0.1)', color: '#667eea', width: 56, height: 56 }}>
                    <SecurityIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Private & Secure
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your code is processed in-memory and sent directly to the AI provider. Review data is stored locally as text files for debugging and history.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card
                sx={{
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #fff 0%, #f9f9f9 100%)',
                  border: '1px solid #eee',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                }}
              >
                <CardContent sx={{ p: 4, display: 'flex', gap: 3 }}>
                  <Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: 56, height: 56 }}>
                    <SpeedIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Lightning Fast
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Get a comprehensive review of complex PRs in seconds, allowing you to merge faster with confidence.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

               <Box
                sx={{
                  p: 3,
                  mt: 2,
                  borderRadius: '16px',
                  bgcolor: '#24292e',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <Typography variant="body1" sx={{ fontStyle: 'italic', mb: 1, opacity: 0.9 }}>
                  "Code Tanuki catches the bugs I miss when I'm tired."
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  — Every Developer Ever
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </MainLayout>
  );
}
