'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Box,
  Typography,
  LinearProgress,
  Stack,
} from '@mui/material';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { ClarifyingQuestion, QAAnswer } from '@/types/breakdown';
import { useState } from 'react';

interface Props {
  open: boolean;
  questions: ClarifyingQuestion[];
  qaRound: number;
  maxQaRounds: number;
  onSubmit: (answers: QAAnswer[]) => void;
  onSkip: () => void;
  loading?: boolean;
}

const categoryColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  api: 'primary',
  database: 'secondary',
  'external-service': 'info',
  ui: 'success',
  'business-logic': 'warning',
  other: 'default',
};

const categoryLabels: Record<string, string> = {
  api: 'API',
  database: 'Database',
  'external-service': 'External Service',
  ui: 'UI',
  'business-logic': 'Business Logic',
  other: 'Other',
};

export function ClarifyingQADialog({
  open,
  questions,
  qaRound,
  maxQaRounds,
  onSubmit,
  onSkip,
  loading,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const hasAllAnswers = questions.every((q) => (answers[q.id] || '').trim().length > 0);

  const handleSubmit = () => {
    const answerList: QAAnswer[] = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] || '',
    }));
    onSubmit(answerList);
    setAnswers({});
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <QuestionAnswerIcon sx={{ color: '#a78bfa', fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Clarifying Questions
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Round {qaRound} of {maxQaRounds} — Answer to help AI generate better technical cards
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(qaRound / maxQaRounds) * 100}
          sx={{
            mt: 1.5,
            height: 4,
            borderRadius: 2,
            background: 'rgba(167, 139, 250, 0.2)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #a78bfa 0%, #7c3aed 100%)',
            },
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {questions.map((q, idx) => (
            <Box key={q.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: '#6b7280',
                    minWidth: 20,
                  }}
                >
                  {idx + 1}.
                </Typography>
                <Chip
                  label={categoryLabels[q.category] || q.category}
                  color={categoryColors[q.category] || 'default'}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, pl: 3.5 }}>
                {q.question}
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={5}
                placeholder="Your answer..."
                value={answers[q.id] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    background: 'white',
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#a78bfa',
                    },
                  },
                }}
              />
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onSkip}
          disabled={loading}
          variant="outlined"
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            borderColor: '#d1d5db',
            color: '#6b7280',
            '&:hover': { borderColor: '#9ca3af', background: 'rgba(0,0,0,0.03)' },
          }}
        >
          Skip Questions
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!hasAllAnswers || loading}
          variant="contained"
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            },
            '&.Mui-disabled': { opacity: 0.5 },
          }}
        >
          {loading ? 'Analyzing...' : 'Submit Answers'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
