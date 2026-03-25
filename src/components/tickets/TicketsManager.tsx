'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Avatar,
  Card,
  Fade,
  Grow,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Link as MuiLink,
  DialogTitle,
  DialogContent,
  TextField,
  Dialog,
  DialogActions,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format } from 'date-fns';
import { safeFormat, isAfterSafe } from '@/lib/utils/date';
import { LocalTicket, TicketType } from '@/types/ticket';
import { TicketFilters } from './TicketFilters';
import { TicketDetailDialog } from './TicketDetailDialog';
import { EpicGroupView } from './EpicGroupView';
import { StoryView } from './StoryView';
import { getTypeChipSx, getStatusChipSx } from './ticketColors';

function isTicketUnsynced(ticket: LocalTicket) {
  if (!ticket.jiraKey) return true;
  if (!ticket.syncedAt) return true;
  return isAfterSafe(ticket.updatedAt, ticket.syncedAt);
}

type ViewMode = 'list' | 'epic' | 'story';

export function TicketsManager() {
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('story');

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TicketType | ''>('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selection (for bulk actions) - DataGrid v8 uses object model
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set(),
  });

  // Detail dialog
  const [selectedTicket, setSelectedTicket] = useState<LocalTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const params = useParams();
  const router = useRouter();
  const initialLoadRef = useRef(false);

  // Sync New Ticket dialog
  const [syncNewDialogOpen, setSyncNewDialogOpen] = useState(false);
  const [syncNewJiraKey, setSyncNewJiraKey] = useState('');
  const [syncNewLoading, setSyncNewLoading] = useState(false);

  // Action menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTicket, setMenuTicket] = useState<LocalTicket | null>(null);

  // Feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [bulkLoading, setBulkLoading] = useState<'create' | 'sync' | null>(null);
  const [jiraBaseUrl, setJiraBaseUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => { if (d.jiraBaseUrl) setJiraBaseUrl(d.jiraBaseUrl); })
      .catch(() => {});
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();
      const raw: LocalTicket[] = data.tickets || [];
      raw.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setTickets(raw);
    } catch {
      showSnackbar('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Handle deep linking from URL
  useEffect(() => {
    const localId = params?.localId as string | undefined;
    if (localId && tickets.length > 0 && !initialLoadRef.current) {
      const ticket = tickets.find((t) => t.localId === localId);
      if (ticket) {
        handleOpenDialog(ticket);
        initialLoadRef.current = true;
      }
    }
  }, [params, tickets]);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleClearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>, ticket: LocalTicket) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuTicket(ticket);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuTicket(null);
  };

  const handleOpenDialog = async (ticket: LocalTicket) => {
    setSelectedTicket(ticket); // show dialog immediately with index data
    setDialogOpen(true);
    handleCloseMenu();

    // Update URL
    window.history.pushState(null, '', `/tickets/${ticket.localId}`);

    // Fetch full item (includes description, acceptanceCriteria, etc.)
    try {
      const res = await fetch(`/api/tickets/${ticket.localId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
      }
    } catch {
      // keep index data if fetch fails
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTicket(null);
    // Restore URL
    window.history.pushState(null, '', '/tickets');
  };

  const handleSave = async (localId: string, updates: Partial<LocalTicket>) => {
    const res = await fetch(`/api/tickets/${localId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save');
    }
    const data = await res.json();
    setTickets((prev) => prev.map((t) => (t.localId === localId ? data.ticket : t)));
    setSelectedTicket(data.ticket);
    showSnackbar('Ticket saved');
  };

  const handleDelete = async (localId: string) => {
    if (!confirm('Delete this ticket?')) return;
    const res = await fetch(`/api/tickets/${localId}`, { method: 'DELETE' });
    if (res.ok) {
      setTickets((prev) => prev.filter((t) => t.localId !== localId));
      showSnackbar('Ticket deleted');
    } else {
      showSnackbar('Failed to delete ticket', 'error');
    }
    handleCloseMenu();
  };

  const handleCreateOnJira = async (localId: string) => {
    const res = await fetch(`/api/tickets/${localId}/jira`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create on Jira');
    await fetchTickets();
    if (selectedTicket?.localId === localId) {
      const resDetail = await fetch(`/api/tickets/${localId}`);
      if (resDetail.ok) {
        const dataDetail = await resDetail.json();
        setSelectedTicket(dataDetail.ticket);
      }
    }
    showSnackbar(`Created on Jira: ${data.jiraKey}`);
  };

  const handleUpdateOnJira = async (localId: string) => {
    const res = await fetch(`/api/tickets/${localId}/jira`, { method: 'PATCH' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update on Jira');
    }
    await fetchTickets();
    if (selectedTicket?.localId === localId) {
      const resDetail = await fetch(`/api/tickets/${localId}`);
      if (resDetail.ok) {
        const dataDetail = await resDetail.json();
        setSelectedTicket(dataDetail.ticket);
      }
    }
    showSnackbar('Updated on Jira');
  };

  const handleRefreshLocal = async (localId: string) => {
    const [res] = await Promise.all([
      fetch(`/api/tickets/${localId}`),
      fetchTickets(),
    ]);
    if (!res.ok) throw new Error('Failed to refresh');
    const data = await res.json();
    setSelectedTicket(data.ticket);
  };

  const handleSyncFromJira = async (localId: string) => {
    const res = await fetch(`/api/tickets/${localId}/jira`, { method: 'GET' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync');
    await fetchTickets();
    if (selectedTicket?.localId === localId) {
      const resDetail = await fetch(`/api/tickets/${localId}`);
      if (resDetail.ok) {
        const dataDetail = await resDetail.json();
        setSelectedTicket(dataDetail.ticket);
      }
    }
    showSnackbar('Synced from Jira');
  };

  const getSelectedIds = (): string[] => {
    if (rowSelectionModel.type === 'include') {
      return [...rowSelectionModel.ids] as string[];
    }
    return tickets.map((t) => t.localId).filter((id) => !rowSelectionModel.ids.has(id));
  };

  const handleBulkAction = async (action: 'create' | 'sync') => {
    const selectedLocalIds = getSelectedIds();
    if (selectedLocalIds.length === 0) return;

    setBulkLoading(action);
    try {
      const res = await fetch('/api/tickets/bulk-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, localIds: selectedLocalIds }),
      });
      const data = await res.json();
      if (res.ok) {
        showSnackbar(
          `${action === 'create' ? 'Created' : 'Synced'} ${data.succeeded.length} ticket(s)${
            data.failed.length > 0 ? `, ${data.failed.length} failed` : ''
          }`,
          data.failed.length > 0 ? 'error' : 'success'
        );
        await fetchTickets();
        setRowSelectionModel({ type: 'include', ids: new Set() });
      } else {
        showSnackbar(data.error || 'Bulk operation failed', 'error');
      }
    } catch {
      showSnackbar('Bulk operation failed', 'error');
    } finally {
      setBulkLoading(null);
    }
  };

  const handleSyncNewTicket = async () => {
    if (!syncNewJiraKey.trim()) return;
    setSyncNewLoading(true);
    try {
      const res = await fetch('/api/tickets/sync-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jiraKey: syncNewJiraKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync ticket');
      
      showSnackbar(`Ticket ${data.ticket.jiraKey} synced successfully`);
      setSyncNewDialogOpen(false);
      setSyncNewJiraKey('');
      fetchTickets();
    } catch (e: any) {
      showSnackbar(e.message || 'Failed to sync new ticket', 'error');
    } finally {
      setSyncNewLoading(false);
    }
  };

  const columns: GridColDef<LocalTicket>[] = [
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            ...getTypeChipSx(params.value),
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        />
      ),
    },
    {
      field: 'jiraKey',
      headerName: 'Jira Key',
      width: 110,
      renderCell: (params) =>
        params.value ? (
          <Typography
            variant="body2"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDialog(params.row);
            }}
            sx={{
              fontWeight: 600,
              color: '#6366f1',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {params.value}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      minWidth: 220,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            '&:hover': { color: '#6366f1' },
          }}
          onClick={() => handleOpenDialog(params.row)}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            label={params.value}
            size="small"
            sx={{
              ...getStatusChipSx(params.value),
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          />
          {isTicketUnsynced(params.row) && (
            <Tooltip title="Local changes not synced to Jira">
              <CloudOffIcon sx={{ fontSize: 18, color: '#f59e0b', ml: 0.5 }} />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 90,
      renderCell: (params) =>
        params.value ? (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.value}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      field: 'storyPoints',
      headerName: 'SP',
      width: 60,
      renderCell: (params) =>
        params.value !== undefined && params.value !== null ? (
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
            {params.value}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      field: 'updatedAt',
      headerName: 'Updated',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {safeFormat(params.value, 'MMM dd, HH:mm')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={(e) => handleOpenMenu(e, params.row)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const selectedIds = getSelectedIds();
  const selectedCount = selectedIds.length;
  const selectedHaveJiraKey = selectedIds.some((id) => tickets.find((t) => t.localId === id)?.jiraKey);

  return (
    <Box>
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                backgroundColor: '#eef2ff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
              }}
            >
              <AssignmentIcon sx={{ fontSize: 28, color: '#6366f1' }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  color: '#3730a3',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                }}
              >
                Jira Tickets
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage AI-generated tickets and sync with Jira
              </Typography>
            </Box>
            {/* <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedTicket(null);
                setDialogOpen(true);
              }}
              sx={{
                backgroundColor: '#6366f1',
                boxShadow: 'none',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '10px',
                px: 2.5,
                '&:hover': { backgroundColor: '#4f46e5', boxShadow: 'none' },
              }}
            >
              New Ticket
            </Button> */}
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <Grow in timeout={800}>
              <Card elevation={0} sx={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', p: 2, borderRadius: '14px' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {tickets.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Total Tickets
                </Typography>
              </Card>
            </Grow>
            <Grow in timeout={1000}>
              <Card elevation={0} sx={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', p: 2, borderRadius: '14px' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#15803d' }}>
                  {tickets.filter((t) => t.jiraKey).length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#16a34a', mt: 0.5 }}>
                  On Jira
                </Typography>
              </Card>
            </Grow>
            <Grow in timeout={1200}>
              <Card elevation={0} sx={{ backgroundColor: '#fdf4ff', border: '1px solid #e9d5ff', p: 2, borderRadius: '14px' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#7e22ce' }}>
                  {tickets.filter((t) => !t.jiraKey).length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#9333ea', mt: 0.5 }}>
                  Not Created
                </Typography>
              </Card>
            </Grow>
            <Grow in timeout={1400}>
              <Card elevation={0} sx={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', p: 2, borderRadius: '14px' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
                  {tickets.filter((t) => t.type === 'Story').length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#2563eb', mt: 0.5 }}>
                  Stories
                </Typography>
              </Card>
            </Grow>
          </Box>
        </Box>
      </Fade>

      <Grow in timeout={1600}>
        <Box>
          {/* Sticky header — lives outside the Card so no overflow ancestor blocks it */}
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'white',
              borderRadius: '24px 24px 0 0',
              borderBottom: '1px solid #f1f5f9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              p: 3,
              pb: 2,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '3px',
                borderRadius: '24px 24px 0 0',
                background: 'linear-gradient(90deg, #c7d2fe 0%, #a5b4fc 50%, #bfdbfe 100%)',
              },
            }}
          >
            {/* Filters */}
            <TicketFilters
              search={search}
              onSearchChange={setSearch}
              type={typeFilter}
              onTypeChange={setTypeFilter}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              onClear={handleClearFilters}
            />

            {/* Toolbar: View Toggle + Bulk Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, val) => val && setViewMode(val)}
                size="small"
                sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600 } }}
              >
                <ToggleButton value="list">
                  <ViewListIcon sx={{ mr: 0.5, fontSize: 18 }} />
                  List
                </ToggleButton>
                <ToggleButton value="story">
                  <AutoStoriesIcon sx={{ mr: 0.5, fontSize: 18 }} />
                  Story View
                </ToggleButton>
                <ToggleButton value="epic">
                  <AccountTreeIcon sx={{ mr: 0.5, fontSize: 18 }} />
                  Epic View
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Bulk Actions & New Sync */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Tooltip title="Refresh tickets from local files">
                  <IconButton onClick={fetchTickets} size="small" color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={() => setSyncNewDialogOpen(true)}
                  size="small"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    borderColor: '#c7d2fe',
                    color: '#4f46e5',
                    '&:hover': { backgroundColor: '#eef2ff', borderColor: '#a5b4fc' },
                  }}
                >
                  Sync New Ticket
                </Button>

                {selectedCount > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 1, pl: 2, borderLeft: '1px solid #e2e8f0' }}>
                    <Chip
                      label={`${selectedCount} selected`}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    <Tooltip title={
                      selectedIds.every(id => tickets.find(t => t.localId === id)?.jiraKey)
                        ? "All selected tickets are already created on Jira"
                        : "Create selected tickets on Jira (skips already created)"
                    }>
                      <span>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={
                            bulkLoading === 'create' ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <CloudUploadIcon />
                            )
                          }
                          disabled={
                            !!bulkLoading ||
                            selectedIds.every(id => tickets.find(t => t.localId === id)?.jiraKey)
                          }
                          onClick={() => handleBulkAction('create')}
                          sx={{
                            backgroundColor: '#dcfce7',
                            color: '#14532d',
                            boxShadow: 'none',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            '&:hover': { backgroundColor: '#bbf7d0', boxShadow: 'none' },
                            '&.Mui-disabled': {
                              backgroundColor: '#f1f5f9',
                              color: '#94a3b8'
                            }
                          }}
                        >
                          Create {selectedCount} on Jira
                      </Button>
                    </span>
                  </Tooltip>
                  {selectedHaveJiraKey && (
                    <Tooltip title="Sync selected tickets from Jira">
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            bulkLoading === 'sync' ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <SyncIcon />
                            )
                          }
                          disabled={!!bulkLoading}
                          onClick={() => handleBulkAction('sync')}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                          Sync {selectedCount} from Jira
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>
          </Box>
          </Box>

          {/* Views */}
          <Card
            elevation={0}
            sx={{
              background: 'white',
              borderRadius: '0 0 24px 24px',
              overflow: 'hidden',
            }}
          >
          <Box sx={{ p: 3, pt: 2 }}>
            {viewMode === 'list' && (
              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={tickets}
                  columns={columns}
                  getRowId={(row) => row.localId}
                  loading={loading}
                  checkboxSelection
                  rowSelectionModel={rowSelectionModel}
                  onRowSelectionModelChange={setRowSelectionModel}
                  disableRowSelectionOnClick
                  pageSizeOptions={[20, 50, 100]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 20 } },
                    sorting: { sortModel: [{ field: 'updatedAt', sort: 'desc' }] },
                  }}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
                    '& .MuiDataGrid-cell:focus': { outline: 'none' },
                    '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(99, 102, 241, 0.04)' },
                    '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', borderRadius: '8px', mb: 1 },
                  }}
                />
              </Box>
            )}
            {viewMode === 'story' && (
              <StoryView
                tickets={tickets}
                jiraBaseUrl={jiraBaseUrl}
                onTicketClick={handleOpenDialog}
              />
            )}
            {viewMode === 'epic' && (
              <EpicGroupView
                tickets={tickets}
                jiraBaseUrl={jiraBaseUrl}
                onTicketClick={handleOpenDialog}
              />
            )}
          </Box>
          </Card>
        </Box>
      </Grow>

      {/* Row Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => menuTicket && handleOpenDialog(menuTicket)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View / Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={async () => {
            if (menuTicket) {
              try {
                await handleCreateOnJira(menuTicket.localId);
              } catch (e) {
                showSnackbar(e instanceof Error ? e.message : 'Failed', 'error');
              }
              handleCloseMenu();
            }
          }}
          disabled={!!menuTicket?.jiraKey}
        >
          <ListItemIcon>
            <CloudUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{menuTicket?.jiraKey ? `Created: ${menuTicket.jiraKey}` : 'Create on Jira'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={async () => {
            if (menuTicket) {
              try {
                await handleSyncFromJira(menuTicket.localId);
              } catch (e) {
                showSnackbar(e instanceof Error ? e.message : 'Failed', 'error');
              }
              handleCloseMenu();
            }
          }}
          disabled={!menuTicket?.jiraKey}
        >
          <ListItemIcon>
            <SyncIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sync from Jira</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => menuTicket && handleDelete(menuTicket.localId)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Sync New Ticket Dialog */}
      <Dialog open={syncNewDialogOpen} onClose={() => setSyncNewDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Sync from Jira</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            label="Jira Issue Key"
            placeholder="e.g. SCRUM-123"
            fullWidth
            value={syncNewJiraKey}
            onChange={(e) => setSyncNewJiraKey(e.target.value)}
            disabled={syncNewLoading}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSyncNewDialogOpen(false)} disabled={syncNewLoading} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSyncNewTicket}
            disabled={!syncNewJiraKey.trim() || syncNewLoading}
            startIcon={syncNewLoading ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            sx={{
              backgroundColor: '#6366f1',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#4f46e5', boxShadow: 'none' },
            }}
          >
            Sync Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail / Edit Dialog */}
      <TicketDetailDialog
        ticket={selectedTicket}
        open={dialogOpen}
        jiraBaseUrl={jiraBaseUrl}
        allTickets={tickets}
        onClose={handleCloseDialog}
        onSave={handleSave}
        onCreateOnJira={handleCreateOnJira}
        onUpdateOnJira={handleUpdateOnJira}
        onSyncFromJira={handleSyncFromJira}
        onRefresh={handleRefreshLocal}
        onTicketClick={handleOpenDialog}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: '12px', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
