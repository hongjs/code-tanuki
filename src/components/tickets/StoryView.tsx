'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Link as MuiLink,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { LocalTicket } from '@/types/ticket';
import { getTypeChipSx, getStatusChipSx } from './ticketColors';

function isTicketUnsynced(ticket: LocalTicket) {
  if (!ticket.jiraKey) return true;
  if (!ticket.syncedAt) return true;
  return new Date(ticket.updatedAt).getTime() > new Date(ticket.syncedAt).getTime();
}

interface StoryViewProps {
  tickets: LocalTicket[];
  jiraBaseUrl?: string;
  onTicketClick: (ticket: LocalTicket) => void;
}

export function StoryView({ tickets, jiraBaseUrl, onTicketClick }: StoryViewProps) {
  // Index all tickets by jiraKey for quick lookup
  const byKey: Record<string, LocalTicket> = {};
  for (const t of tickets) {
    if (t.jiraKey) byKey[t.jiraKey] = t;
  }

  // Sub-tasks indexed by parentKey
  const subtasksByParent: Record<string, LocalTicket[]> = {};
  for (const t of tickets) {
    if (t.type === 'Sub-task' || t.type === 'Bug') {
      const key = t.parentKey || '__none__';
      if (!subtasksByParent[key]) subtasksByParent[key] = [];
      subtasksByParent[key].push(t);
    }
  }

  // Stories and Tasks (what we show as "story cards")
  const stories = tickets.filter((t) => t.type === 'Story' || t.type === 'Task');

  // Group by parent epic key
  const grouped: Record<string, LocalTicket[]> = {};
  for (const s of stories) {
    const key = s.parentKey || '__none__';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  const epicKeys = Object.keys(grouped);

  if (stories.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
        <Typography variant="body1">No stories or tasks found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {epicKeys.map((epicKey) => {
        const epic = epicKey !== '__none__' ? byKey[epicKey] : null;
        const group = grouped[epicKey];

        return (
          <Box key={epicKey}>
            {/* Epic header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Chip
                label="Epic"
                size="small"
                sx={{ ...getTypeChipSx('Epic'), fontWeight: 700, fontSize: '0.95rem' }}
              />
              {epic ? (
                <>
                  {epic.jiraKey && (
                    <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 700 }}>
                      {epic.jiraKey}
                    </Typography>
                  )}
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, color: '#3730a3', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => onTicketClick(epic)}
                  >
                    {epic.title}
                  </Typography>
                  {epic.jiraKey && jiraBaseUrl && (
                    <Tooltip title="Open in Jira">
                      <IconButton
                        size="small"
                        component="a"
                        href={`${jiraBaseUrl}/browse/${epic.jiraKey}`}
                        target="_blank"
                        rel="noopener"
                        sx={{ color: '#c7d2fe', '&:hover': { color: '#6366f1' }, p: 0.5 }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              ) : (
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#94a3b8' }}>
                  No Epic
                </Typography>
              )}
              {epic && isTicketUnsynced(epic) && (
                <Tooltip title="Local changes not synced to Jira">
                  <CloudOffIcon sx={{ fontSize: 18, color: '#f59e0b', ml: 0.5 }} />
                </Tooltip>
              )}
              <Box sx={{ flex: 1, height: '1px', background: '#e9d5ff', ml: 1 }} />
              <Typography variant="caption" sx={{ color: '#a5b4fc', fontWeight: 600, flexShrink: 0 }}>
                {group.length} item{group.length !== 1 ? 's' : ''}
              </Typography>
            </Box>

            {/* Story / Task cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2 }}>
              {group.map((story) => {
                const subs = subtasksByParent[story.jiraKey || story.localId] || [];
                return (
                  <StoryCard
                    key={story.localId}
                    story={story}
                    subtasks={subs}
                    jiraBaseUrl={jiraBaseUrl}
                    onTicketClick={onTicketClick}
                  />
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Story Card ──────────────────────────────────────────────

interface StoryCardProps {
  story: LocalTicket;
  subtasks: LocalTicket[];
  jiraBaseUrl?: string;
  onTicketClick: (ticket: LocalTicket) => void;
}

function StoryCard({ story, subtasks, jiraBaseUrl, onTicketClick }: StoryCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          borderColor: '#c7d2fe',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.08)',
        },
      }}
    >
      {/* Left accent bar by type */}
      <Box sx={{ display: 'flex' }}>
        <Box
          sx={{
            width: 4,
            flexShrink: 0,
            background: getTypeChipSx(story.type).backgroundColor,
            opacity: 0.8,
          }}
        />
        <CardContent sx={{ flex: 1, p: '16px 20px !important' }}>
          {/* Top row: type + key + status + actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={story.type}
              size="small"
              sx={{ ...getTypeChipSx(story.type), fontWeight: 700, fontSize: '1rem' }}
            />
            {story.jiraKey && (
              jiraBaseUrl ? (
                <MuiLink
                  href={`${jiraBaseUrl}/browse/${story.jiraKey}`}
                  target="_blank"
                  rel="noopener"
                  sx={{ fontSize: '1rem', fontWeight: 700, color: '#6366f1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {story.jiraKey}
                </MuiLink>
              ) : (
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#6366f1' }}>
                  {story.jiraKey}
                </Typography>
              )
            )}

            <Box sx={{ flex: 1 }} />

            {story.storyPoints !== undefined && (
              <Chip
                label={`${story.storyPoints} pts`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.95rem', fontWeight: 600, borderColor: '#e2e8f0', color: '#64748b' }}
              />
            )}
            <Chip
              label={story.status}
              size="small"
              sx={{ ...getStatusChipSx(story.status), fontWeight: 600, fontSize: '1rem' }}
            />
            {isTicketUnsynced(story) && (
              <Tooltip title="Local changes not synced to Jira">
                <CloudOffIcon sx={{ fontSize: 18, color: '#f59e0b', ml: 0.5 }} />
              </Tooltip>
            )}
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onTicketClick(story)}
                sx={{ color: '#cbd5e1', '&:hover': { color: '#6366f1' }, ml: 0.5 }}
              >
                <EditIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Title */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: '#1e293b',
              lineHeight: 1.5,
              cursor: 'pointer',
              '&:hover': { color: '#4f46e5' },
            }}
            onClick={() => onTicketClick(story)}
          >
            {story.title}
          </Typography>

          {/* Sub-tasks */}
          {subtasks.length > 0 && (
            <>
              <Divider sx={{ my: 1.5, borderColor: '#f1f5f9' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <SubdirectoryArrowRightIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  Sub-tasks ({subtasks.length})
                </Typography>
              </Box>
              <List dense disablePadding>
                {subtasks.map((sub) => (
                  <ListItem
                    key={sub.localId}
                    disableGutters
                    sx={{ py: 0.25 }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          label={sub.status}
                          size="small"
                          sx={{ ...getStatusChipSx(sub.status), fontWeight: 600, fontSize: '0.9rem' }}
                        />
                        {isTicketUnsynced(sub) && (
                          <Tooltip title="Local changes not synced to Jira">
                            <CloudOffIcon sx={{ fontSize: 16, color: '#f59e0b', ml: 1 }} />
                          </Tooltip>
                        )}
                      </Box>
                    }
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 10 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: getTypeChipSx(sub.type).color,
                          flexShrink: 0,
                        }}
                      />
                      {sub.jiraKey && (
                        <Typography variant="caption" sx={{ color: '#a5b4fc', fontWeight: 600, flexShrink: 0 }}>
                          {sub.jiraKey}
                        </Typography>
                      )}
                      <ListItemText
                        primary={sub.title}
                        primaryTypographyProps={{
                          variant: 'caption',
                          color: '#475569',
                          noWrap: true,
                          sx: { cursor: 'pointer', '&:hover': { color: '#4f46e5' } },
                          onClick: () => onTicketClick(sub),
                        }}
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </CardContent>
      </Box>
    </Card>
  );
}
