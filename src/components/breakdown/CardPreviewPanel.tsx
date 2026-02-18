'use client';

import {
  Box,
  Typography,
  Chip,
  Button,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  TextField,
  Divider,
  Paper,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PublishIcon from '@mui/icons-material/Publish';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { TechnicalCard, KnowledgeSuggestion } from '@/types/breakdown';
import { useState } from 'react';

interface Props {
  cards: TechnicalCard[];
  summary: string;
  knowledgeSuggestion?: KnowledgeSuggestion;
  onPublish: (cards: TechnicalCard[]) => void;
  onCardsChange: (cards: TechnicalCard[]) => void;
  loading?: boolean;
}

interface CardEditorProps {
  card: TechnicalCard;
  onSave: (card: TechnicalCard) => void;
}

function CardEditor({ card, onSave }: CardEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card);
  const [testTab, setTestTab] = useState(0);

  if (editing) {
    return (
      <Box sx={{ p: 2, background: '#f8faff', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
        <TextField
          fullWidth
          label="Title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          sx={{ mb: 2 }}
          size="small"
        />
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Description"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          sx={{ mb: 2 }}
          size="small"
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Technical Details"
          value={draft.technicalDetails}
          onChange={(e) => setDraft((d) => ({ ...d, technicalDetails: e.target.value }))}
          sx={{ mb: 2 }}
          size="small"
        />
        <TextField
          fullWidth
          type="number"
          label="Story Points (Fibonacci: 1,2,3,5,8,13)"
          value={draft.storyPoints}
          onChange={(e) =>
            setDraft((d) => ({ ...d, storyPoints: parseInt(e.target.value) || 1 }))
          }
          sx={{ mb: 2 }}
          size="small"
          inputProps={{ min: 1, max: 13 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={() => {
              onSave(draft);
              setEditing(false);
            }}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Save
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setDraft(card);
              setEditing(false);
            }}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
            <Chip
              label={card.type === 'subtask' ? 'Subtask' : 'Story'}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                background: card.type === 'subtask'
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                  : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
              }}
            />
            <Chip
              label={`${card.storyPoints} SP`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
              }}
            />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {card.title}
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => setEditing(true)}
          sx={{ textTransform: 'none', fontSize: '0.75rem', ml: 1, flexShrink: 0 }}
        >
          Edit
        </Button>
      </Box>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, lineHeight: 1.6 }}>
        {card.description}
      </Typography>

      {card.acceptanceCriteria.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 0.5 }}>
            Acceptance Criteria
          </Typography>
          <Stack spacing={0.5}>
            {card.acceptanceCriteria.map((ac, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10b981',
                    mt: 0.8,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" sx={{ color: '#374151', lineHeight: 1.5 }}>
                  {ac}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {card.technicalDetails && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 0.5 }}>
            Technical Details
          </Typography>
          <Box
            sx={{
              p: 1.5,
              background: '#1e293b',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#94a3b8',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {card.technicalDetails}
          </Box>
        </Box>
      )}

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 0.5 }}>
          Test Strategy
        </Typography>
        <Tabs
          value={testTab}
          onChange={(_, v) => setTestTab(v)}
          sx={{
            minHeight: 32,
            '& .MuiTab-root': { minHeight: 32, fontSize: '0.7rem', textTransform: 'none', py: 0.5 },
          }}
        >
          <Tab label={`Unit (${card.testStrategy.unit.length})`} />
          <Tab label={`Integration (${card.testStrategy.integration.length})`} />
          <Tab label={`E2E (${card.testStrategy.e2e.length})`} />
          <Tab label={`Regression (${card.testStrategy.regression.length})`} />
        </Tabs>
        <Box sx={{ p: 1, background: '#f8faff', borderRadius: '0 0 8px 8px', minHeight: 40 }}>
          {[
            card.testStrategy.unit,
            card.testStrategy.integration,
            card.testStrategy.e2e,
            card.testStrategy.regression,
          ][testTab]?.map((test, i) => (
            <Typography key={i} variant="caption" sx={{ display: 'block', color: '#374151', mb: 0.25 }}>
              • {test}
            </Typography>
          ))}
        </Box>
      </Box>

      {card.risks.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 0.5 }}>
            Risks
          </Typography>
          {card.risks.map((risk, i) => (
            <Typography key={i} variant="caption" sx={{ display: 'block', color: '#ef4444', mb: 0.25 }}>
              ⚠ {risk}
            </Typography>
          ))}
        </Box>
      )}

      {card.challengeQuestion && (
        <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
          <strong>🤔 Challenge:</strong> {card.challengeQuestion}
        </Alert>
      )}
    </Box>
  );
}

export function CardPreviewPanel({
  cards,
  summary,
  knowledgeSuggestion,
  onPublish,
  onCardsChange,
  loading,
}: Props) {
  const totalPoints = cards.reduce((sum, c) => sum + c.storyPoints, 0);

  const handleCardSave = (updatedCard: TechnicalCard) => {
    onCardsChange(cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `technical-cards-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* Summary Header */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.1) 100%)',
          border: '1px solid rgba(67, 233, 123, 0.3)',
          mb: 3,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Breakdown Complete
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          {summary}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip
            label={`${cards.length} Cards`}
            sx={{ background: 'rgba(67, 233, 123, 0.2)', fontWeight: 600 }}
          />
          <Chip
            label={`${totalPoints} Story Points Total`}
            sx={{ background: 'rgba(56, 249, 215, 0.2)', fontWeight: 600 }}
          />
          <Chip
            label={`${cards.filter((c) => c.type === 'subtask').length} Subtasks`}
            sx={{ background: 'rgba(79, 172, 254, 0.2)', fontWeight: 600 }}
          />
          <Chip
            label={`${cards.filter((c) => c.type === 'story').length} Stories`}
            sx={{ background: 'rgba(240, 147, 251, 0.2)', fontWeight: 600 }}
          />
        </Box>
      </Box>

      {/* Cards */}
      {cards.map((card, idx) => (
        <Accordion
          key={card.id}
          defaultExpanded={idx === 0}
          sx={{
            mb: 1.5,
            borderRadius: '12px !important',
            '&:before': { display: 'none' },
            border: '1px solid #e5e7eb',
            '&.Mui-expanded': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ px: 2.5, py: 1.5 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
              <Typography
                variant="caption"
                sx={{ color: '#9ca3af', fontWeight: 700, minWidth: 24 }}
              >
                #{idx + 1}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                  {card.title}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                <Chip
                  label={card.type === 'subtask' ? 'Subtask' : 'Story'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: card.type === 'subtask'
                      ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                      : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    color: 'white',
                  }}
                />
                <Chip
                  label={`${card.storyPoints} SP`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                  }}
                />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
            <Divider sx={{ mb: 2 }} />
            <CardEditor card={card} onSave={handleCardSave} />
          </AccordionDetails>
        </Accordion>
      ))}

      {knowledgeSuggestion && (
        <Paper
          sx={{
            p: 2,
            mt: 2,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.08) 0%, rgba(245, 87, 108, 0.08) 100%)',
            border: '1px solid rgba(240, 147, 251, 0.3)',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c3aed' }}>
            💡 Knowledge Base Suggestion
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            Section: <strong>{knowledgeSuggestion.section}</strong> — {knowledgeSuggestion.reason}
          </Typography>
        </Paper>
      )}

      {/* Action Bar */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mt: 3,
          pt: 2,
          borderTop: '1px solid #e5e7eb',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          sx={{
            textTransform: 'none',
            borderRadius: '10px',
            borderColor: '#d1d5db',
          }}
        >
          Download JSON
        </Button>
        <Button
          variant="contained"
          startIcon={<PublishIcon />}
          onClick={() => onPublish(cards)}
          disabled={loading}
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
          {loading ? 'Publishing...' : `Publish ${cards.length} Cards to Jira`}
        </Button>
      </Box>
    </Box>
  );
}
