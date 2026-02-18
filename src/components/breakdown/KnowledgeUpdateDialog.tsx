'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { KnowledgeSuggestion } from '@/types/breakdown';

interface Props {
  open: boolean;
  suggestion: KnowledgeSuggestion;
  currentKnowledge: string;
  onApprove: () => void;
  onSkip: () => void;
  loading?: boolean;
}

export function KnowledgeUpdateDialog({
  open,
  suggestion,
  currentKnowledge,
  onApprove,
  onSkip,
  loading,
}: Props) {
  return (
    <Dialog
      open={open}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #fdf8ff 0%, #f5f0ff 100%)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MenuBookIcon sx={{ color: '#7c3aed', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Knowledge Base Update
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              AI suggests updating your project knowledge base
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
            <Chip
              label={`Section: ${suggestion.section}`}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
          <Box
            sx={{
              p: 2,
              background: 'rgba(124, 58, 237, 0.08)',
              borderRadius: '10px',
              border: '1px solid rgba(124, 58, 237, 0.2)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c3aed', display: 'block', mb: 0.5 }}>
              Why this update?
            </Typography>
            <Typography variant="body2" sx={{ color: '#374151' }}>
              {suggestion.reason}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#6b7280', display: 'block', mb: 1 }}>
              CURRENT KNOWLEDGE BASE
            </Typography>
            <Box
              sx={{
                p: 2,
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#374151',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 300,
                overflow: 'auto',
                lineHeight: 1.6,
              }}
            >
              {currentKnowledge || '(Empty — no knowledge base yet)'}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c3aed', display: 'block', mb: 1 }}>
              PROPOSED ADDITION
            </Typography>
            <Box
              sx={{
                p: 2,
                background: 'rgba(124, 58, 237, 0.04)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '10px',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#374151',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 300,
                overflow: 'auto',
                lineHeight: 1.6,
              }}
            >
              {suggestion.content}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onSkip}
          disabled={loading}
          variant="outlined"
          startIcon={<SkipNextIcon />}
          sx={{
            textTransform: 'none',
            borderRadius: '10px',
            borderColor: '#d1d5db',
            color: '#6b7280',
          }}
        >
          Skip for Now
        </Button>
        <Button
          onClick={onApprove}
          disabled={loading}
          variant="contained"
          startIcon={<CheckCircleIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #e879f9 0%, #ef4444 100%)',
            },
          }}
        >
          {loading ? 'Updating...' : 'Approve & Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
