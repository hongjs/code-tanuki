'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Collapse,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DEFAULT_CLAUDE_MODEL_ID } from '@/lib/constants/models';

export default function KnowledgePage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from context
  const [initContext, setInitContext] = useState('');
  const [initExpanded, setInitExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/knowledge')
      .then((r) => r.json())
      .then((data) => setContent(data.content || ''))
      .catch(() => setError('Failed to load knowledge base'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateFromContext = async () => {
    if (!initContext.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: initContext,
          modelId: DEFAULT_CLAUDE_MODEL_ID,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setGeneratedPreview(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyGenerated = () => {
    setContent(generatedPreview);
    setGeneratedPreview('');
    setInitContext('');
    setInitExpanded(false);
  };

  return (
    <MainLayout>
      <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <MenuBookIcon sx={{ color: '#f093fb', fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Knowledge Base
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Project context that AI uses for better technical breakdowns
            </Typography>
          </Box>
        </Box>

        {/* Initialize from Context Section */}
        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: '16px',
            border: '1px solid rgba(240, 147, 251, 0.3)',
            background: 'rgba(240, 147, 251, 0.03)',
          }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', mb: initExpanded ? 2 : 0 }}
            onClick={() => setInitExpanded((v) => !v)}
          >
            <AutoAwesomeIcon sx={{ color: '#f093fb', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
              Initialize from Context
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {initExpanded ? 'Collapse' : 'Expand'}
            </Typography>
          </Box>

          <Collapse in={initExpanded}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Paste raw context (conversation summaries, tech stack notes, architecture decisions) and AI will structure it into a proper knowledge.md.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={6}
              placeholder="Paste your raw context here... e.g. tech stack info, database schema, API conventions, business rules..."
              value={initContext}
              onChange={(e) => setInitContext(e.target.value)}
              disabled={generating}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />

            {generatedPreview ? (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#f093fb', display: 'block', mb: 1 }}>
                  Preview (AI-structured)
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
                    mb: 2,
                  }}
                >
                  {generatedPreview}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleApplyGenerated}
                    sx={{
                      textTransform: 'none',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      fontWeight: 600,
                    }}
                  >
                    Apply to Editor
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setGeneratedPreview('')}
                    sx={{ textTransform: 'none', borderRadius: '10px' }}
                  >
                    Discard
                  </Button>
                </Box>
              </Box>
            ) : (
              <Button
                variant="contained"
                onClick={handleGenerateFromContext}
                disabled={!initContext.trim() || generating}
                startIcon={
                  generating ? (
                    <CircularProgress size={16} sx={{ color: 'inherit' }} />
                  ) : (
                    <AutoAwesomeIcon />
                  )
                }
                sx={{
                  textTransform: 'none',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  fontWeight: 600,
                  '&.Mui-disabled': { opacity: 0.5 },
                }}
              >
                {generating ? 'Generating...' : 'Generate Knowledge.md'}
              </Button>
            )}
          </Collapse>
        </Paper>

        <Divider sx={{ mb: 3 }} />

        {/* Editor */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        {saved && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{ mb: 2, borderRadius: '10px' }}
          >
            Knowledge base saved successfully!
          </Alert>
        )}

        <Paper sx={{ p: 0, borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#6b7280', fontFamily: 'monospace' }}>
              data/knowledge.md
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving || loading}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                '&.Mui-disabled': { opacity: 0.5 },
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TextField
              fullWidth
              multiline
              minRows={20}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Project Knowledge Base&#10;&#10;## Tech Stack&#10;...&#10;&#10;## Database Schema&#10;...&#10;&#10;## API Conventions&#10;..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  border: 'none',
                  borderRadius: 0,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  '& fieldset': { border: 'none' },
                },
              }}
            />
          )}
        </Paper>

        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
          This knowledge base is automatically used during story breakdowns to provide better context to the AI. Write in markdown format.
        </Typography>
      </Box>
    </MainLayout>
  );
}
