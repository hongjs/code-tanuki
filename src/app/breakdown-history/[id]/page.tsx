'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  CircularProgress,
  Button,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { useRouter } from 'next/navigation';
import { BreakdownSession, FullJiraTicket, QAEntry, TechnicalCard } from '@/types/breakdown';
import { format } from 'date-fns';

interface JiraTicketSummary {
  key: string;
  summary: string;
  type: string;
  status: string;
  description?: string;
  labels?: string[];
  storyPoints?: number;
  epicKey?: string;
}

interface SessionDetail {
  session: BreakdownSession;
  jiraTickets: JiraTicketSummary[];
  qaHistory: QAEntry[];
  cards: TechnicalCard[];
}

export default function BreakdownDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/breakdown/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <Typography>Session not found</Typography>
      </MainLayout>
    );
  }

  const { session, jiraTickets, qaHistory, cards } = data;

  return (
    <MainLayout>
      <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Button
            variant="text"
            onClick={() => router.push('/breakdown-history')}
            sx={{ textTransform: 'none', color: 'text.secondary', minWidth: 0, p: 0, mr: 1 }}
          >
            ← Back
          </Button>
          <AccountTreeIcon sx={{ color: '#43e97b' }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {session.jiraTicketIds.join(', ')}
          </Typography>
          <Chip
            label={session.status}
            size="small"
            sx={{
              fontWeight: 600,
              background: session.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
              color: session.status === 'completed' ? '#15803d' : '#6b7280',
            }}
          />
        </Box>

        {/* Jira Ticket(s) Summary */}
        {jiraTickets?.length > 0 && (
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {jiraTickets.map((jiraTicket) => (
              <Paper key={jiraTicket.key} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip
                    label={jiraTicket.key}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      color: '#065f46',
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {jiraTicket.summary}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Type: {jiraTicket.type} · Status: {jiraTicket.status}
                  {jiraTicket.storyPoints && ` · ${jiraTicket.storyPoints} SP`}
                </Typography>
                {jiraTicket.description && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, color: 'text.secondary', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}
                  >
                    {jiraTicket.description.substring(0, 400)}
                    {jiraTicket.description.length > 400 ? '...' : ''}
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        )}

        {/* Session Metadata */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: '12px', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <Stack direction="row" spacing={3} flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Model</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{session.modelId}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Detail Level</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{session.detailLevel}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Dev Coaching</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{session.enableDevCoaching ? 'Enabled' : 'Disabled'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Q&A Rounds</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{session.qaRoundCount}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Created</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {format(new Date(session.createdAt), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Q&A History Timeline */}
        {qaHistory.length > 0 && (
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <QuestionAnswerIcon sx={{ color: '#a78bfa', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Q&A History ({qaHistory.length} round{qaHistory.length !== 1 ? 's' : ''})
              </Typography>
            </Box>
            {qaHistory.map((entry) => (
              <Box key={entry.round} sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#a78bfa' }}>
                  Round {entry.round}
                </Typography>
                {entry.questions.map((q) => {
                  const answer = entry.answers.find((a) => a.questionId === q.id);
                  return (
                    <Box key={q.id} sx={{ mb: 1.5, pl: 1.5, borderLeft: '2px solid #a78bfa40' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25, fontSize: '0.8rem' }}>
                        Q: {q.question}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        A: {answer?.answer || '(not answered)'}
                      </Typography>
                    </Box>
                  );
                })}
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
          </Paper>
        )}

        {/* Generated Cards (read-only) */}
        {cards.length > 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Generated Cards ({cards.length}) — {cards.reduce((s, c) => s + c.storyPoints, 0)} SP total
            </Typography>
            {cards.map((card, idx) => (
              <Accordion
                key={card.id}
                sx={{
                  mb: 1.5,
                  borderRadius: '12px !important',
                  '&:before': { display: 'none' },
                  border: '1px solid #e5e7eb',
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700 }}>#{idx + 1}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>{card.title}</Typography>
                    <Chip
                      label={card.type}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                    <Chip
                      label={`${card.storyPoints} SP`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                    {card.description}
                  </Typography>
                  {card.acceptanceCriteria.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 0.5 }}>
                        Acceptance Criteria
                      </Typography>
                      {card.acceptanceCriteria.map((ac, i) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block', color: '#374151', mb: 0.25 }}>
                          • {ac}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {card.risks.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 0.5 }}>
                        Risks
                      </Typography>
                      {card.risks.map((r, i) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block', color: '#ef4444', mb: 0.25 }}>
                          ⚠ {r}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Published Issues */}
        {session.publishedIssueKeys && session.publishedIssueKeys.length > 0 && (
          <Paper sx={{ p: 2.5, mt: 3, borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.05)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#15803d', mb: 1 }}>
              Published Issues
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {session.publishedIssueKeys.map((key) => (
                <Chip
                  key={key}
                  label={key}
                  size="small"
                  sx={{ fontWeight: 700, background: 'rgba(34, 197, 94, 0.2)', color: '#15803d' }}
                />
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
}
