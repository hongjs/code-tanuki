'use client';

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { LocalTicket } from '@/types/ticket';
import { isAfterSafe } from '@/lib/utils/date';
import { getTypeChipSx, getStatusChipSx } from './ticketColors';

function isTicketUnsynced(ticket: LocalTicket) {
  if (!ticket.jiraKey) return true;
  if (!ticket.syncedAt) return true;
  return isAfterSafe(ticket.updatedAt, ticket.syncedAt);
}

interface EpicGroupViewProps {
  tickets: LocalTicket[];
  jiraBaseUrl?: string;
  onTicketClick: (ticket: LocalTicket) => void;
}

export function EpicGroupView({ tickets, jiraBaseUrl, onTicketClick }: EpicGroupViewProps) {
  const epics = tickets.filter((t) => t.type === 'Epic');
  const nonEpics = tickets.filter((t) => t.type !== 'Epic');

  const byParent: Record<string, LocalTicket[]> = {};
  for (const t of nonEpics) {
    const key = t.parentKey || '__none__';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(t);
  }

  const orphans = byParent['__none__'] || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {epics.map((epic) => {
        const children = byParent[epic.jiraKey || epic.localId] || [];
        return (
          <Accordion
            key={epic.localId}
            defaultExpanded
            elevation={0}
            sx={{
              border: '1px solid #e9d5ff',
              borderRadius: '12px !important',
              '&:before': { display: 'none' },
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#7c3aed' }} />}
              sx={{
                background: '#faf5ff',
                '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 },
              }}
            >
              <Chip
                label="Epic"
                size="small"
                sx={{ ...getTypeChipSx('Epic'), fontWeight: 700, fontSize: '0.95rem' }}
              />
              {epic.jiraKey && (
                <Chip
                  label={epic.jiraKey}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: '0.95rem', borderColor: '#c4b5fd', color: '#5b21b6' }}
                />
              )}
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, color: '#1e293b' }}>
                {epic.title}
              </Typography>
              <Chip
                label={epic.status}
                size="small"
                sx={{ ...getStatusChipSx(epic.status), fontWeight: 600, fontSize: '0.95rem', mr: 1 }}
              />
              {isTicketUnsynced(epic) && (
                <Tooltip title="Local changes not synced to Jira">
                  <CloudOffIcon sx={{ fontSize: 18, color: '#f59e0b', mr: 1 }} />
                </Tooltip>
              )}
              <Tooltip title="Edit ticket">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onTicketClick(epic); }}
                  sx={{ color: '#94a3b8', '&:hover': { color: '#6366f1' } }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {epic.jiraKey && jiraBaseUrl && (
                <Tooltip title="Open in Jira">
                  <IconButton
                    size="small"
                    component="a"
                    href={`${jiraBaseUrl}/browse/${epic.jiraKey}`}
                    target="_blank"
                    rel="noopener"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ color: '#94a3b8', '&:hover': { color: '#6366f1' } }}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, background: '#fff' }}>
              {children.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, pl: 4 }}>
                  No stories or tasks in this epic
                </Typography>
              ) : (
                <List dense disablePadding>
                  {children.map((child, idx) => {
                    const subtasks = byParent[child.jiraKey || child.localId] || [];
                    return (
                      <Box key={child.localId}>
                        <ListItem
                          divider={idx < children.length - 1 || subtasks.length > 0}
                          onClick={() => onTicketClick(child)}
                          sx={{ pl: 4, cursor: 'pointer', '&:hover': { background: '#f0f4ff' } }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                label={child.status}
                                size="small"
                                sx={{ ...getStatusChipSx(child.status), fontWeight: 600, fontSize: '0.9rem' }}
                              />
                              {isTicketUnsynced(child) && (
                                <Tooltip title="Local changes not synced to Jira">
                                  <CloudOffIcon sx={{ fontSize: 16, color: '#f59e0b', ml: 0.5 }} />
                                </Tooltip>
                              )}
                              <Tooltip title="Edit ticket">
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); onTicketClick(child); }}
                                  sx={{ color: '#cbd5e1', '&:hover': { color: '#6366f1' } }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {child.jiraKey && jiraBaseUrl && (
                                <Tooltip title="Open in Jira">
                                  <IconButton
                                    size="small"
                                    component="a"
                                    href={`${jiraBaseUrl}/browse/${child.jiraKey}`}
                                    target="_blank"
                                    rel="noopener"
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    sx={{ color: '#cbd5e1', '&:hover': { color: '#6366f1' } }}
                                  >
                                    <OpenInNewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          }
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 14 }}>
                            <Chip
                              label={child.type}
                              size="small"
                              sx={{ ...getTypeChipSx(child.type), fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}
                            />
                            {child.jiraKey && (
                              <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600, flexShrink: 0 }}>
                                {child.jiraKey}
                              </Typography>
                            )}
                            <ListItemText
                              primary={child.title}
                              primaryTypographyProps={{ variant: 'body2', noWrap: true, color: '#374151' }}
                            />
                          </Box>
                        </ListItem>
                        {subtasks.map((sub) => (
                          <ListItem
                            key={sub.localId}
                            onClick={() => onTicketClick(sub)}
                            sx={{ pl: 8, background: '#fafafa', cursor: 'pointer', '&:hover': { background: '#f0f4ff' } }}
                            secondaryAction={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={sub.status}
                                  size="small"
                                  sx={{ ...getStatusChipSx(sub.status), fontWeight: 600, fontSize: '0.9rem' }}
                                />
                                {isTicketUnsynced(sub) && (
                                  <Tooltip title="Local changes not synced to Jira">
                                    <CloudOffIcon sx={{ fontSize: 16, color: '#f59e0b', ml: 0.5 }} />
                                  </Tooltip>
                                )}
                                <Tooltip title="Edit ticket">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onTicketClick(sub); }}
                                    sx={{ color: '#cbd5e1', '&:hover': { color: '#6366f1' } }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            }
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 14 }}>
                              <Chip
                                label="Sub-task"
                                size="small"
                                sx={{ ...getTypeChipSx('Sub-task'), fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}
                              />
                              {sub.jiraKey && (
                                <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600, flexShrink: 0 }}>
                                  {sub.jiraKey}
                                </Typography>
                              )}
                              <ListItemText
                                primary={sub.title}
                                primaryTypographyProps={{ variant: 'body2', noWrap: true, color: '#374151' }}
                              />
                            </Box>
                          </ListItem>
                        ))}
                      </Box>
                    );
                  })}
                </List>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {orphans.length > 0 && (
        <Accordion
          defaultExpanded={false}
          elevation={0}
          sx={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px !important',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#94a3b8' }} />}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>
              No Epic ({orphans.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense disablePadding>
              {orphans.map((ticket, idx) => (
                <ListItem
                  key={ticket.localId}
                  divider={idx < orphans.length - 1}
                  onClick={() => onTicketClick(ticket)}
                  sx={{ pl: 3, cursor: 'pointer', '&:hover': { background: '#f0f4ff' } }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isTicketUnsynced(ticket) && (
                        <Tooltip title="Local changes not synced to Jira">
                          <CloudOffIcon sx={{ fontSize: 16, color: '#f59e0b', mr: 0.5 }} />
                        </Tooltip>
                      )}
                      <Tooltip title="Edit ticket">
                        <IconButton
                          size="small"
                          onClick={() => onTicketClick(ticket)}
                          sx={{ color: '#cbd5e1', '&:hover': { color: '#6366f1' } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 6 }}>
                    <Chip
                      label={ticket.type}
                      size="small"
                      sx={{ ...getTypeChipSx(ticket.type), fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}
                    />
                    <ListItemText
                      primary={ticket.title}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true, color: '#374151' }}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}
