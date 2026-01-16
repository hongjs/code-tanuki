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

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
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
  { key: 'fetching-github', label: 'GitHub PR', icon: GitHubIcon, color: '#667eea' },
  { key: 'fetching-jira', label: 'Jira Ticket', icon: DescriptionIcon, color: '#764ba2' },
  { key: 'ai-review', label: 'AI Analysis', icon: AutoAwesomeIcon, color: '#f093fb' },
  { key: 'approval', label: 'Approval', icon: HowToRegIcon, color: '#3b82f6' },
  { key: 'posting-comments', label: 'Post Comments', icon: CloudUploadIcon, color: '#f5576c' },
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
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
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
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
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
                background: 'rgba(102, 126, 234, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
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
                            background: isActive || isCompleted
                              ? `linear-gradient(135deg, ${step.color} 0%, ${step.color}dd 100%)`
                              : '#f3f4f6',
                            color: isActive || isCompleted ? 'white' : '#9ca3af',
                            boxShadow: isActive
                              ? `0 4px 12px ${step.color}40`
                              : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            '&::after': isActive
                              ? {
                                  content: '""',
                                  position: 'absolute',
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  border: `2px solid ${step.color}`,
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
                            <CircularProgress size={24} sx={{ color: 'white' }} />
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
