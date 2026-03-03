'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Chip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import CloseIcon from '@mui/icons-material/Close';
import { LocalTicket, TicketType } from '@/types/ticket';
import { format } from 'date-fns';
import { safeFormat } from '@/lib/utils/date';
import { getTypeChipSx, getStatusChipSx, getPriorityColor } from './ticketColors';

interface TicketDetailDialogProps {
  ticket: LocalTicket | null;
  open: boolean;
  jiraBaseUrl?: string;
  onClose: () => void;
  onSave: (localId: string, updates: Partial<LocalTicket>) => Promise<void>;
  onCreateOnJira: (localId: string) => Promise<void>;
  onUpdateOnJira: (localId: string) => Promise<void>;
  onSyncFromJira: (localId: string) => Promise<void>;
}

const TICKET_TYPES: TicketType[] = ['Epic', 'Story', 'Task', 'Sub-task', 'Bug'];
const TICKET_STATUSES = ['To Do', 'In Progress', 'Done'];
const TICKET_PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export function TicketDetailDialog({
  ticket,
  open,
  jiraBaseUrl,
  onClose,
  onSave,
  onCreateOnJira,
  onUpdateOnJira,
  onSyncFromJira,
}: TicketDetailDialogProps) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jiraLoading, setJiraLoading] = useState<'create' | 'update' | 'sync' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<LocalTicket>>({});
  
  // Reset state when ticket changes or dialog opens/closes
  useEffect(() => {
    setEditMode(false);
    setForm({});
    setError(null);
  }, [ticket?.localId]);

  const handleStartEdit = () => {
    if (!ticket) return;
    setForm({
      title: ticket.title,
      description: ticket.description || '',
      type: ticket.type,
      status: ticket.status,
      priority: ticket.priority || '',
      storyPoints: ticket.storyPoints,
      assignee: ticket.assignee || '',
      parentKey: ticket.parentKey || '',
    });
    setEditMode(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!ticket) return;
    setSaving(true);
    setError(null);
    try {
      const updates: Partial<LocalTicket> = {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        status: form.status,
        priority: form.priority || undefined,
        storyPoints: form.storyPoints,
        assignee: form.assignee || undefined,
        parentKey: form.parentKey || undefined,
      };
      await onSave(ticket.localId, updates);
      setEditMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleJiraAction = async (action: 'create' | 'update' | 'sync') => {
    if (!ticket) return;
    setJiraLoading(action);
    setError(null);
    try {
      if (action === 'create') await onCreateOnJira(ticket.localId);
      else if (action === 'update') await onUpdateOnJira(ticket.localId);
      else await onSyncFromJira(ticket.localId);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`);
    } finally {
      setJiraLoading(null);
    }
  };

  if (!ticket) return null;

  const displayTicket = editMode ? { ...ticket, ...form } : ticket;

  const markdownSx = {
    fontSize: '1rem',
    color: '#475569',
    lineHeight: 1.7,
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      fontWeight: 700,
      color: '#1e293b',
      mt: 1.5,
      mb: 0.5,
    },
    '& h1': { fontSize: '1.25rem' },
    '& h2': { fontSize: '1.15rem' },
    '& h3': { fontSize: '1.05rem' },
    '& h4, & h5, & h6': { fontSize: '1rem' },
    '& p': { mb: 1, mt: 0 },
    '& ul, & ol': { pl: 2.5, mb: 1 },
    '& li': { mb: 0.25 },
    '& code': {
      backgroundColor: '#f1f5f9',
      borderRadius: '4px',
      px: 0.6,
      py: 0.2,
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      color: '#e11d48',
    },
    '& pre': {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      p: 1.5,
      overflowX: 'auto',
      mb: 1,
      '& code': {
        backgroundColor: 'transparent',
        color: '#334155',
        px: 0,
        py: 0,
      },
    },
    '& blockquote': {
      borderLeft: '3px solid #c7d2fe',
      pl: 2,
      ml: 0,
      color: '#64748b',
      fontStyle: 'italic',
    },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      mb: 1.5,
      display: 'block',
      overflowX: 'auto',
    },
    '& th, & td': {
      border: '1px solid #e2e8f0',
      px: 1.5,
      py: 0.75,
      textAlign: 'left',
      fontSize: '0.95rem',
    },
    '& th': {
      backgroundColor: '#f8fafc',
      fontWeight: 700,
    },
    '& a': { color: '#6366f1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
    '& hr': { border: 'none', borderTop: '1px solid #e2e8f0', my: 1.5 },
    '& input[type="checkbox"]': { mr: 0.5 },
    // inline HTML from ADF (textColor → span, underline → u)
    '& span[style]': { display: 'inline' },
    '& u': { textDecoration: 'underline' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden' } }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: '#fafafa',
          borderBottom: '1px solid #f1f5f9',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={displayTicket.type}
            size="small"
            sx={{ ...getTypeChipSx(displayTicket.type), fontWeight: 700 }}
          />
          {ticket.jiraKey && (
            <Chip
              label={ticket.jiraKey}
              size="small"
              variant="outlined"
              component={jiraBaseUrl ? 'a' : 'div'}
              href={jiraBaseUrl ? `${jiraBaseUrl}/browse/${ticket.jiraKey}` : undefined}
              target="_blank"
              rel="noopener"
              icon={<OpenInNewIcon sx={{ fontSize: '14px !important', color: '#6366f1 !important' }} />}
              clickable={!!jiraBaseUrl}
              sx={{ fontWeight: 600, borderColor: '#c7d2fe', color: '#4338ca' }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          {!editMode && (
            <Tooltip title="Edit">
              <IconButton size="small" onClick={handleStartEdit} sx={{ color: '#94a3b8', '&:hover': { color: '#6366f1' } }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Title */}
          {editMode ? (
            <TextField
              label="Title"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
              required
            />
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.3rem' }}>
              {ticket.title}
            </Typography>
          )}

          {/* Type / Status / Priority row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {editMode ? (
              <>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={form.type || ''}
                    onChange={(e) => setForm({ ...form, type: e.target.value as TicketType })}
                    label="Type"
                  >
                    {TICKET_TYPES.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={form.status || ''}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    label="Status"
                  >
                    {TICKET_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={form.priority || ''}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    label="Priority"
                  >
                    <MenuItem value="">None</MenuItem>
                    {TICKET_PRIORITIES.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Story Points"
                  type="number"
                  size="small"
                  value={form.storyPoints ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, storyPoints: e.target.value ? Number(e.target.value) : undefined })
                  }
                  sx={{ width: 120 }}
                />
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                  label={ticket.status}
                  size="small"
                  sx={{ ...getStatusChipSx(ticket.status), fontWeight: 600 }}
                />
                {ticket.priority && (
                  <Chip
                    label={ticket.priority}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, borderColor: '#e2e8f0', color: getPriorityColor(ticket.priority) }}
                  />
                )}
                {ticket.storyPoints !== undefined && (
                  <Chip
                    label={`${ticket.storyPoints} pts`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {ticket.assignee && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1rem' }}>
                    Assignee: <strong>{ticket.assignee}</strong>
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Parent Key */}
          {editMode && (
            <TextField
              label="Parent Key (e.g. ABC-1540)"
              size="small"
              value={form.parentKey || ''}
              onChange={(e) => setForm({ ...form, parentKey: e.target.value })}
              sx={{ maxWidth: 260 }}
            />
          )}
          {!editMode && ticket.parentKey && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1rem' }}>
              Parent: <strong>{ticket.parentKey}</strong>
            </Typography>
          )}

          <Divider />

          {/* Description */}
          {editMode ? (
            <TextField
              label="Description"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              minRows={4}
              maxRows={10}
            />
          ) : ticket.description ? (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>
                Description
              </Typography>
              <Box sx={markdownSx}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {ticket.description}
                </ReactMarkdown>
              </Box>
            </Box>
          ) : null}


          {/* Attachments Section */}
          {!editMode && ticket.attachments && ticket.attachments.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>
                  Attachments
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {ticket.attachments
                    .filter((a) => a.mimeType?.startsWith('image/'))
                    .map((attachment) => (
                      <Box
                        key={attachment.id}
                        sx={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          maxWidth: '100%',
                          width: '400px',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <Box sx={{ p: 1, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', wordBreak: 'break-all' }}>
                            {attachment.filename}
                          </Typography>
                        </Box>
                        <img
                          src={`/api/jira/attachments/${attachment.id}`}
                          alt={attachment.filename || 'Attachment'}
                          style={{ width: '100%', height: 'auto', display: 'block' }}
                          loading="lazy"
                        />
                      </Box>
                    ))}
                </Box>
              </Box>
            </>
          )}

          <Divider />

          {/* Metadata */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              Local ID: <strong>{ticket.localId}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              Created: {safeFormat(ticket.createdAt, 'MMM dd, yyyy HH:mm')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              Updated: {safeFormat(ticket.updatedAt, 'MMM dd, yyyy HH:mm')}
            </Typography>
            {ticket.syncedAt && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                Synced: {safeFormat(ticket.syncedAt, 'MMM dd, yyyy HH:mm')}
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Comments Section */}
          {!editMode && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, fontSize: '1rem' }}>
                Comments {ticket.comments && ticket.comments.length > 0 ? `(${ticket.comments.length})` : ''}
              </Typography>
              {ticket.comments && ticket.comments.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {ticket.comments.map((comment) => (
                    <Box
                      key={comment.id}
                      sx={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        p: 2,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                          {comment.author}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {safeFormat(comment.created, 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </Box>
                      <Box sx={{ ...markdownSx, fontSize: '0.95rem' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {comment.body}
                        </ReactMarkdown>
                      </Box>
                      {comment.updated !== comment.created && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                          Edited: {safeFormat(comment.updated, 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                  No comments yet.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {/* Jira Actions */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {!ticket.jiraKey ? (
            <Button
              variant="contained"
              size="small"
              startIcon={
                jiraLoading === 'create' ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon />
              }
              disabled={!!jiraLoading || editMode}
              onClick={() => handleJiraAction('create')}
              sx={{
                backgroundColor: '#dcfce7',
                color: '#14532d',
                boxShadow: 'none',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                '&:hover': { backgroundColor: '#bbf7d0', boxShadow: 'none' },
              }}
            >
              Create on Jira
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  jiraLoading === 'update' ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <CloudUploadIcon />
                  )
                }
                disabled={!!jiraLoading || editMode}
                onClick={() => handleJiraAction('update')}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                Update on Jira
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  jiraLoading === 'sync' ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />
                }
                disabled={!!jiraLoading || editMode}
                onClick={() => handleJiraAction('sync')}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                Sync from Jira
              </Button>
            </>
          )}
        </Box>

        {/* Edit Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {editMode ? (
            <>
              <Button
                size="small"
                startIcon={<CancelIcon />}
                onClick={handleCancelEdit}
                disabled={saving}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  backgroundColor: '#6366f1',
                  boxShadow: 'none',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  '&:hover': { backgroundColor: '#4f46e5', boxShadow: 'none' },
                }}
              >
                Save
              </Button>
            </>
          ) : (
            <Button
              size="small"
              onClick={onClose}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              Close
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
