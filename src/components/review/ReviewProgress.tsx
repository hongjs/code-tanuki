'use client';

import {
  Box,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Typography,
  CircularProgress,
  Fade,
  Zoom,
  StepConnector,
  stepConnectorClasses,
  styled,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import GitHubIcon from '@mui/icons-material/GitHub';
import DescriptionIcon from '@mui/icons-material/Description';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { ReviewStatus } from '@/types/review';

interface ReviewProgressProps {
  status: ReviewStatus;
  error?: string;
}

const ColorlibConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #a5b4fc 0%, #c4b5fd 50%, #f0abfc 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #a5b4fc 0%, #c4b5fd 50%, #f0abfc 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#eaeaf0',
    borderRadius: 1,
  },
}));

const steps = [
  { key: 'fetching-github', label: 'GitHub PR', icon: GitHubIcon, bg: '#eef2ff', color: '#4338ca' },
  { key: 'fetching-jira', label: 'Jira Ticket', icon: DescriptionIcon, bg: '#f5f3ff', color: '#6d28d9' },
  { key: 'ai-review', label: 'AI Analysis', icon: AutoAwesomeIcon, bg: '#fdf4ff', color: '#7e22ce' },
  { key: 'approval', label: 'Approval', icon: HowToRegIcon, bg: '#eff6ff', color: '#1d4ed8' },
  { key: 'posting-comments', label: 'Post Comments', icon: CloudUploadIcon, bg: '#fff1f2', color: '#be123c' },
];

export function ReviewProgress({ status, error }: ReviewProgressProps) {
  const getActiveStep = () => {
    switch (status) {
      case 'fetching-github':
        return 0;
      case 'fetching-jira':
        return 1;
      case 'ai-review':
        return 2;
      case 'approval':
        return 3;
      case 'posting-comments':
        return 4;
      case 'success':
        return 5;
      case 'error':
        return -1;
      default:
        return 0;
    }
  };

  const activeStep = getActiveStep();

  if (status === 'idle') {
    return null;
  }

  return (
    <Box sx={{ width: '100%', mt: 4 }}>
      {status === 'error' ? (
        <Fade in>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <ErrorIcon sx={{ color: '#ef4444', fontSize: 28 }} />
            <Typography variant="body1" sx={{ color: '#991b1b', fontWeight: 500 }}>
              {error || 'An error occurred'}
            </Typography>
          </Box>
        </Fade>
      ) : status === 'success' ? (
        <Zoom in>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 28 }} />
            <Typography variant="body1" sx={{ color: '#065f46', fontWeight: 500 }}>
              Review completed successfully!
            </Typography>
          </Box>
        </Zoom>
      ) : (
        <Fade in>
          <Box>
            <LinearProgress
              sx={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(99, 102, 241, 0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #a5b4fc 0%, #c4b5fd 50%, #f0abfc 100%)',
                },
              }}
            />
            <Stepper
              activeStep={activeStep}
              alternativeLabel
              connector={<ColorlibConnector />}
              sx={{ mt: 3 }}
            >
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = status === step.key;
                const isCompleted = activeStep > index;

                return (
                  <Step key={step.key}>
                    <StepLabel
                      StepIconComponent={() => (
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isActive || isCompleted ? step.bg : '#f3f4f6',
                            color: isActive || isCompleted ? step.color : '#9ca3af',
                            boxShadow: isActive
                              ? `0 4px 12px ${step.bg}`
                              : 'none',
                            border: isActive || isCompleted
                              ? `1.5px solid ${step.color}30`
                              : '1.5px solid transparent',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            '&::after': isActive
                              ? {
                                  content: '""',
                                  position: 'absolute',
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  border: `2px solid ${step.color}50`,
                                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                  '@keyframes pulse': {
                                    '0%, 100%': {
                                      opacity: 1,
                                      transform: 'scale(1)',
                                    },
                                    '50%': {
                                      opacity: 0,
                                      transform: 'scale(1.3)',
                                    },
                                  },
                                }
                              : {},
                          }}
                        >
                          {isActive ? (
                            <CircularProgress size={24} sx={{ color: step.color }} />
                          ) : isCompleted ? (
                            <CheckCircleIcon sx={{ fontSize: 24 }} />
                          ) : (
                            <Icon sx={{ fontSize: 24 }} />
                          )}
                        </Box>
                      )}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isActive ? 600 : 400,
                          color: isActive || isCompleted ? step.color : '#6b7280',
                          mt: 1,
                          display: 'block',
                        }}
                      >
                        {step.label}
                      </Typography>
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          </Box>
        </Fade>
      )}
    </Box>
  );
}
