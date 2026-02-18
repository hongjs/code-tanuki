'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import {
  Box,
  Chip,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Fade,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { BreakdownListEntry, BreakdownStatus } from '@/types/breakdown';
import { format } from 'date-fns';
import { getModelById } from '@/lib/constants/models';

const statusColors: Record<BreakdownStatus, string> = {
  idle: '#9ca3af',
  'fetching-jira': '#60a5fa',
  'analyzing-images': '#818cf8',
  'ai-initial-analysis': '#a78bfa',
  clarifying: '#f59e0b',
  're-analyzing': '#fb923c',
  'generating-cards': '#34d399',
  preview: '#10b981',
  publishing: '#3b82f6',
  'knowledge-update': '#8b5cf6',
  completed: '#22c55e',
  error: '#ef4444',
};

const statusLabels: Record<BreakdownStatus, string> = {
  idle: 'Idle',
  'fetching-jira': 'Fetching Jira',
  'analyzing-images': 'Analyzing Images',
  'ai-initial-analysis': 'AI Analysis',
  clarifying: 'Clarifying',
  're-analyzing': 'Re-analyzing',
  'generating-cards': 'Generating Cards',
  preview: 'Preview',
  publishing: 'Publishing',
  'knowledge-update': 'Knowledge Update',
  completed: 'Completed',
  error: 'Error',
};

export function BreakdownHistoryTable() {
  const router = useRouter();
  const [items, setItems] = useState<BreakdownListEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(paginationModel.page + 1),
        limit: String(paginationModel.pageSize),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/breakdown/list?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [paginationModel, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const columns: GridColDef[] = [
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 160,
      renderCell: (params) => (
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          {format(new Date(params.value), 'MMM dd, HH:mm')}
        </Typography>
      ),
    },
    {
      field: 'jiraTicketIds',
      headerName: 'Ticket(s)',
      width: 180,
      renderCell: (params) => {
        const ids: string[] = Array.isArray(params.value) ? params.value : [params.value];
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {ids.slice(0, 2).map((id) => (
              <Chip
                key={id}
                label={id}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  height: 20,
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: '#065f46',
                }}
              />
            ))}
            {ids.length > 2 && (
              <Chip
                label={`+${ids.length - 2}`}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
              />
            )}
          </Box>
        );
      },
    },
    {
      field: 'jiraSummary',
      headerName: 'Summary',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.8rem',
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => {
        const s = params.value as BreakdownStatus;
        return (
          <Chip
            label={statusLabels[s] || s}
            size="small"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 600,
              background: `${statusColors[s] || '#9ca3af'}20`,
              color: statusColors[s] || '#9ca3af',
              border: `1px solid ${statusColors[s] || '#9ca3af'}40`,
            }}
          />
        );
      },
    },
    {
      field: 'cardCount',
      headerName: 'Cards',
      width: 80,
      renderCell: (params) => (
        <Chip
          label={params.value || 0}
          size="small"
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            background: 'rgba(79, 172, 254, 0.15)',
            color: '#1d4ed8',
          }}
        />
      ),
    },
    {
      field: 'modelId',
      headerName: 'Model',
      width: 160,
      renderCell: (params) => {
        const model = getModelById(params.value);
        return (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {model?.name || params.value}
          </Typography>
        );
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AccountTreeIcon sx={{ color: '#43e97b', fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Breakdown History
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {total} session{total !== 1 ? 's' : ''} total
          </Typography>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by ticket ID or summary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />
      </Box>

      <Fade in={!loading}>
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <DataGrid
            rows={items}
            columns={columns}
            rowCount={total}
            loading={loading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            onRowClick={(params) => router.push(`/breakdown-history/${params.id}`)}
            sx={{
              border: 'none',
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': { background: 'rgba(67, 233, 123, 0.04)' },
              },
              '& .MuiDataGrid-columnHeaders': {
                background: 'rgba(67, 233, 123, 0.06)',
                borderBottom: '1px solid #e5e7eb',
              },
              '& .MuiDataGrid-cell': {
                borderColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
              },
            }}
            autoHeight
          />
        </Paper>
      </Fade>
    </Box>
  );
}
