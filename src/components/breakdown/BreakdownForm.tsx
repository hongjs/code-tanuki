'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import { ModelSelector } from '@/components/review/ModelSelector';
import { BreakdownProgress } from './BreakdownProgress';
import { DetailLevelSelector } from './DetailLevelSelector';
import { ClarifyingQADialog } from './ClarifyingQADialog';
import { CardPreviewPanel } from './CardPreviewPanel';
import { KnowledgeUpdateDialog } from './KnowledgeUpdateDialog';
import { BreakdownStatus, ClarifyingQuestion, TechnicalCard, KnowledgeSuggestion, QAAnswer } from '@/types/breakdown';
import { AppConfig } from '@/types/ai';
import { DEFAULT_CLAUDE_MODEL_ID } from '@/lib/constants/models';

interface TicketPreview {
  key: string;
  summary: string;
  type: string;
}

function extractTicketId(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/([A-Z][A-Z0-9_]+-\d+)/i);
  if (match) return match[1].toUpperCase();
  return trimmed.toUpperCase();
}

export function BreakdownForm() {
  // Multi-ticket state
  const [ticketIds, setTicketIds] = useState<string[]>([]);
  const [ticketInput, setTicketInput] = useState('');

  const [modelId, setModelId] = useState(DEFAULT_CLAUDE_MODEL_ID);
  const [detailLevel, setDetailLevel] = useState<'detailed' | 'balanced' | 'minimal'>('balanced');
  const [enableDevCoaching, setEnableDevCoaching] = useState(false);
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  const [status, setStatus] = useState<BreakdownStatus>('idle');
  const [breakdownId, setBreakdownId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [ticketPreviews, setTicketPreviews] = useState<TicketPreview[]>([]);

  // Clarifying Q&A
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [qaRound, setQaRound] = useState(1);
  const [maxQaRounds, setMaxQaRounds] = useState(3);
  const [qaDialogOpen, setQaDialogOpen] = useState(false);

  // Cards
  const [cards, setCards] = useState<TechnicalCard[]>([]);
  const [summary, setSummary] = useState('');
  const [knowledgeSuggestion, setKnowledgeSuggestion] = useState<KnowledgeSuggestion | undefined>();

  // Knowledge update
  const [knowledgeDialogOpen, setKnowledgeDialogOpen] = useState(false);
  const [currentKnowledge, setCurrentKnowledge] = useState('');

  // Ref for scrolling to card preview
  const cardPreviewRef = useRef<HTMLDivElement>(null);

  // Config for ModelSelector
  const [config, setConfig] = useState<AppConfig>({ hasAnthropicKey: true, hasGeminiKey: false, hasJiraConfig: false });
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setConfigLoading(false);
      })
      .catch(() => setConfigLoading(false));
  }, []);

  useEffect(() => {
    if (status === 'preview' && cards.length > 0) {
      setTimeout(() => {
        cardPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [status, cards.length]);

  const isRunning = !['idle', 'clarifying', 'preview', 'knowledge-update', 'completed', 'error'].includes(status);

  // --- Ticket chip helpers ---
  const addTicket = (raw: string) => {
    const id = extractTicketId(raw);
    if (!id) return;
    setTicketIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTicketInput('');
  };

  const removeTicket = (id: string) => {
    setTicketIds((prev) => prev.filter((t) => t !== id));
  };

  const handleTicketKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' ', 'Tab'].includes(e.key)) {
      e.preventDefault();
      if (ticketInput.trim()) addTicket(ticketInput);
    } else if (e.key === 'Backspace' && !ticketInput && ticketIds.length > 0) {
      removeTicket(ticketIds[ticketIds.length - 1]);
    }
  };

  const handleStart = async () => {
    // flush any pending input
    const finalIds = [...ticketIds];
    if (ticketInput.trim()) {
      const id = extractTicketId(ticketInput);
      if (id && !finalIds.includes(id)) finalIds.push(id);
    }
    if (finalIds.length === 0) return;

    setTicketIds(finalIds);
    setTicketInput('');
    setStatus('fetching-jira');
    setError(undefined);
    setTicketPreviews([]);
    setCards([]);

    try {
      const res = await fetch('/api/breakdown/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraTicketIds: finalIds,
          modelId,
          detailLevel,
          enableDevCoaching,
          additionalPrompt: additionalPrompt.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start breakdown');

      setBreakdownId(data.breakdownId);
      setTicketPreviews(data.jiraTickets || []);
      setStatus(data.status);

      // Proceed to analyze
      await runAnalysis(data.breakdownId);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runAnalysis = async (id: string) => {
    setStatus('ai-initial-analysis');
    try {
      const res = await fetch('/api/breakdown/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakdownId: id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      if (data.status === 'clarifying') {
        setClarifyingQuestions(data.questions || []);
        setQaRound(data.qaRound || 1);
        setMaxQaRounds(data.maxQaRounds || 3);
        setStatus('clarifying');
        setQaDialogOpen(true);
      } else {
        // Ready to generate
        await generateCards(id);
      }
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAnswers = async (answers: QAAnswer[]) => {
    if (!breakdownId) return;
    setQaDialogOpen(false);
    setStatus('re-analyzing');

    try {
      const res = await fetch('/api/breakdown/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakdownId, answers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process answers');

      if (data.status === 'clarifying') {
        setClarifyingQuestions(data.questions || []);
        setQaRound(data.qaRound || 1);
        setMaxQaRounds(data.maxQaRounds || 3);
        setStatus('clarifying');
        setQaDialogOpen(true);
      } else {
        await generateCards(breakdownId);
      }
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSkipQuestions = async () => {
    if (!breakdownId) return;
    setQaDialogOpen(false);
    await generateCards(breakdownId);
  };

  const generateCards = async (id: string) => {
    setStatus('generating-cards');
    try {
      const res = await fetch('/api/breakdown/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakdownId: id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Card generation failed');

      setCards(data.cards || []);
      setSummary(data.summary || '');
      setKnowledgeSuggestion(data.knowledgeSuggestion);
      setStatus('preview');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handlePublish = async (finalCards: TechnicalCard[]) => {
    if (!breakdownId) return;
    setStatus('publishing');

    try {
      const res = await fetch('/api/breakdown/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakdownId, cards: finalCards }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publishing failed');

      if (data.status === 'knowledge-update' && data.knowledgeSuggestion) {
        // Load current knowledge for comparison
        const kRes = await fetch('/api/knowledge');
        const kData = await kRes.json();
        setCurrentKnowledge(kData.content || '');
        setKnowledgeSuggestion(data.knowledgeSuggestion);
        setKnowledgeDialogOpen(true);
        setStatus('knowledge-update');
      } else {
        setStatus('completed');
      }
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleKnowledgeApprove = async () => {
    if (!knowledgeSuggestion) return;
    try {
      // Append suggestion to knowledge
      const newContent = currentKnowledge
        ? `${currentKnowledge}\n\n## ${knowledgeSuggestion.section}\n${knowledgeSuggestion.content}`
        : `## ${knowledgeSuggestion.section}\n${knowledgeSuggestion.content}`;

      await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });

      setKnowledgeDialogOpen(false);
      setStatus('completed');
    } catch {
      setKnowledgeDialogOpen(false);
      setStatus('completed');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setBreakdownId(null);
    setError(undefined);
    setTicketIds([]);
    setTicketInput('');
    setTicketPreviews([]);
    setCards([]);
    setSummary('');
    setKnowledgeSuggestion(undefined);
    setClarifyingQuestions([]);
    setQaDialogOpen(false);
    setKnowledgeDialogOpen(false);
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '16px',
          border: '1px solid rgba(67, 233, 123, 0.2)',
          background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.03) 0%, rgba(56, 249, 215, 0.03) 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <AccountTreeIcon sx={{ color: '#43e97b', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Story Breakdown
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Break down Jira user stories into developer-ready technical cards
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Multi-Ticket Chip Input */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Jira Ticket ID(s) or URL(s)
            </Typography>

            {/* Chip container */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                p: ticketIds.length > 0 ? 1 : 0,
                pb: ticketIds.length > 0 ? 1 : 0,
              }}
            >
              {ticketIds.map((id) => (
                <Chip
                  key={id}
                  label={id}
                  onDelete={isRunning ? undefined : () => removeTicket(id)}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    color: '#065f46',
                    '& .MuiChip-deleteIcon': { color: '#065f46', opacity: 0.6 },
                  }}
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={
                  ticketIds.length === 0
                    ? 'PROJ-123 or https://...atlassian.net/browse/PROJ-123'
                    : 'Add another ticket…'
                }
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                onKeyDown={handleTicketKeyDown}
                disabled={isRunning}
                helperText={
                  ticketIds.length === 0
                    ? 'Press Enter, Space, or comma to add. Supports multiple tickets.'
                    : `${ticketIds.length} ticket${ticketIds.length > 1 ? 's' : ''} added — press Enter to add more`
                }
                sx={{
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#43e97b',
                  },
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => { if (ticketInput.trim()) addTicket(ticketInput); }}
                disabled={isRunning || !ticketInput.trim()}
                sx={{
                  minWidth: 40,
                  height: 40,
                  borderColor: '#43e97b',
                  color: '#43e97b',
                  '&:hover': { borderColor: '#38d66b', background: 'rgba(67,233,123,0.08)' },
                  '&.Mui-disabled': { opacity: 0.4 },
                }}
              >
                <AddIcon fontSize="small" />
              </Button>
            </Box>
          </Box>

          {ticketPreviews.length > 0 && (
            <Stack spacing={0.75}>
              {ticketPreviews.map((t) => (
                <Alert key={t.key} severity="success" sx={{ py: 0.5, borderRadius: '10px' }}>
                  <strong>{t.key}</strong> [{t.type}]: {t.summary}
                </Alert>
              ))}
            </Stack>
          )}

          {/* Model Selector */}
          <ModelSelector
            value={modelId}
            onChange={setModelId}
            config={config}
            configLoading={configLoading}
          />

          {/* Detail Level */}
          <DetailLevelSelector
            value={detailLevel}
            onChange={setDetailLevel}
            disabled={isRunning}
          />

          {/* Dev Coaching Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={enableDevCoaching}
                onChange={(e) => setEnableDevCoaching(e.target.checked)}
                disabled={isRunning}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#43e97b' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#43e97b',
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Dev Coaching Mode
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Add challenge questions to each card to deepen developer thinking
                </Typography>
              </Box>
            }
          />

          {/* Additional Prompt */}
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Additional Context (optional)"
            placeholder="Provide any extra context, constraints, or requirements..."
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            disabled={isRunning}
            sx={{
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#43e97b',
              },
            }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {status === 'completed' || status === 'error' ? (
              <Button
                variant="outlined"
                onClick={handleReset}
                sx={{
                  textTransform: 'none',
                  borderRadius: '10px',
                  borderColor: '#43e97b',
                  color: '#43e97b',
                }}
              >
                Start New Breakdown
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleStart}
                disabled={isRunning || (ticketIds.length === 0 && !ticketInput.trim()) || configLoading}
                startIcon={isRunning ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <AccountTreeIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: '#065f46',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #38d66b 0%, #2de9c7 100%)',
                  },
                  '&.Mui-disabled': { opacity: 0.5 },
                }}
              >
                {isRunning ? 'Processing...' : 'Start Breakdown'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Progress */}
      {status !== 'idle' && (
        <Box sx={{ mt: 3 }}>
          <BreakdownProgress status={status} error={error} />
        </Box>
      )}

      {/* Card Preview */}
      {status === 'preview' && cards.length > 0 && (
        <Box ref={cardPreviewRef} sx={{ mt: 4 }}>
          <CardPreviewPanel
            cards={cards}
            summary={summary}
            knowledgeSuggestion={knowledgeSuggestion}
            onPublish={handlePublish}
            onCardsChange={setCards}
            loading={false}
          />
        </Box>
      )}

      {/* Clarifying Q&A Dialog */}
      <ClarifyingQADialog
        open={qaDialogOpen}
        questions={clarifyingQuestions}
        qaRound={qaRound}
        maxQaRounds={maxQaRounds}
        onSubmit={handleAnswers}
        onSkip={handleSkipQuestions}
        loading={isRunning}
      />

      {/* Knowledge Update Dialog */}
      {knowledgeSuggestion && (
        <KnowledgeUpdateDialog
          open={knowledgeDialogOpen}
          suggestion={knowledgeSuggestion}
          currentKnowledge={currentKnowledge}
          onApprove={handleKnowledgeApprove}
          onSkip={() => {
            setKnowledgeDialogOpen(false);
            setStatus('completed');
          }}
        />
      )}
    </Box>
  );
}
