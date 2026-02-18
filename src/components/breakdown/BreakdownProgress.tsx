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
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PreviewIcon from '@mui/icons-material/Preview';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { BreakdownStatus } from '@/types/breakdown';

interface Props {
  status: BreakdownStatus;
  error?: string;
}

const ColorlibConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #43e97b 0%, #38f9d7 50%, #4facfe 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #43e97b 0%, #38f9d7 50%, #4facfe 100%)',
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
  { key: 'fetching-jira', label: 'Fetch Jira', icon: DescriptionIcon, color: '#43e97b' },
  { key: 'analyzing-images', label: 'Analyze Images', icon: ImageIcon, color: '#38f9d7' },
  { key: 'ai-initial-analysis', label: 'AI Analysis', icon: AutoAwesomeIcon, color: '#4facfe' },
  { key: 'clarifying', label: 'Clarify', icon: QuestionAnswerIcon, color: '#a78bfa' },
  { key: 'generating-cards', label: 'Generate Cards', icon: AccountTreeIcon, color: '#fb923c' },
  { key: 'preview', label: 'Preview', icon: PreviewIcon, color: '#f59e0b' },
  { key: 'publishing', label: 'Publish', icon: CloudUploadIcon, color: '#10b981' },
];

function getActiveStep(status: BreakdownStatus): number {
  const order: Record<string, number> = {
    'fetching-jira': 0,
    'analyzing-images': 1,
    'ai-initial-analysis': 2,
    'clarifying': 3,
    're-analyzing': 3,
    'generating-cards': 4,
    'preview': 5,
    'publishing': 6,
    'knowledge-update': 7,
    'completed': 7,
    'error': -1,
  };
  return order[status] ?? 0;
}

export function BreakdownProgress({ status, error }: Props) {
  const activeStep = getActiveStep(status);

  if (status === 'idle') return null;

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
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <ErrorIcon sx={{ color: '#ef4444', fontSize: 28 }} />
            <Typography variant="body1" sx={{ color: '#991b1b', fontWeight: 500 }}>
              {error || 'An error occurred'}
            </Typography>
          </Box>
        </Fade>
      ) : status === 'completed' || status === 'knowledge-update' ? (
        <Zoom in>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 28 }} />
            <Typography variant="body1" sx={{ color: '#065f46', fontWeight: 500 }}>
              {status === 'knowledge-update'
                ? 'Cards published! Review the knowledge base suggestion below.'
                : 'Breakdown completed successfully!'}
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
                background: 'rgba(67, 233, 123, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 50%, #4facfe 100%)',
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
                const isActive = status === step.key || (status === 're-analyzing' && step.key === 'clarifying');
                const isCompleted = activeStep > index;

                return (
                  <Step key={step.key}>
                    <StepLabel
                      StepIconComponent={() => (
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background:
                              isActive || isCompleted
                                ? `linear-gradient(135deg, ${step.color} 0%, ${step.color}dd 100%)`
                                : '#f3f4f6',
                            color: isActive || isCompleted ? 'white' : '#9ca3af',
                            boxShadow: isActive ? `0 4px 12px ${step.color}40` : 'none',
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
                                    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                    '50%': { opacity: 0, transform: 'scale(1.3)' },
                                  },
                                }
                              : {},
                          }}
                        >
                          {isActive ? (
                            <CircularProgress size={22} sx={{ color: 'white' }} />
                          ) : isCompleted ? (
                            <CheckCircleIcon sx={{ fontSize: 22 }} />
                          ) : (
                            <Icon sx={{ fontSize: 22 }} />
                          )}
                        </Box>
                      )}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isActive ? 600 : 400,
                          color: isActive || isCompleted ? step.color : '#6b7280',
                          mt: 0.5,
                          display: 'block',
                          fontSize: '0.7rem',
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
