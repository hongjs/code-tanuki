'use client';

import { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import {
  Box,
  Chip,
  Link as MuiLink,
  Typography,
  Paper,
  Card,
  Avatar,
  Fade,
  Grow,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Review } from '@/types/review';
import { HistoryFilters } from './HistoryFilters';
import { format } from 'date-fns';
import HistoryIcon from '@mui/icons-material/History';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CodeIcon from '@mui/icons-material/Code';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';

export function HistoryTable() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [model, setModel] = useState('');

  // Actions Menu State
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, review: Review) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedReview(review);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedReview(null);
  };

  const handleDownload = (filename: string) => {
    if (!selectedReview) return;
    window.open(`/api/review/${selectedReview.id}/files/${filename}`, '_blank');
    handleMenuClose();
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(paginationModel.page + 1),
        limit: String(paginationModel.pageSize),
      });

      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (model) params.append('model', model);

      const response = await fetch(`/api/history?${params.toString()}`);
      const data = await response.json();

      setReviews(data.reviews);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [paginationModel, search, status, model]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setModel('');
  };

  const successCount = reviews.filter((r) => r.status === 'success').length;
  const totalComments = reviews.reduce((sum, r) => sum + (r.comments?.length || 0), 0);

  const columns: GridColDef<Review>[] = [
    {
      field: 'timestamp',
      headerName: 'Date',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {format(new Date(params.value), 'MMM dd, yyyy HH:mm')}
        </Typography>
      ),
    },
    {
      field: 'repository',
      headerName: 'Repository',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon sx={{ fontSize: 18, color: '#667eea' }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'prNumber',
      headerName: 'PR #',
      width: 80,
      renderCell: (params) => (
        <MuiLink
          href={params.row.prUrl}
          target="_blank"
          rel="noopener"
          sx={{
            fontWeight: 600,
            color: '#667eea',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          #{params.value}
        </MuiLink>
      ),
    },
    {
      field: 'prTitle',
      headerName: 'PR Title',
      width: 300,
      flex: 1,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'jiraTicketId',
      headerName: 'Jira',
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <Chip
            label={params.value}
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              fontWeight: 600,
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            background:
              params.value === 'success'
                ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      field: 'comments',
      headerName: 'Comments',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value?.length || 0}
          size="small"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      field: 'modelId',
      headerName: 'Model',
      width: 150,
      renderCell: (params) => {
        const modelName = params.value?.replace('claude-', '')?.replace('-20250514', '');
        return (
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#6366f1' }}>
            {modelName?.toUpperCase() || params.value}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, params.row)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      {/* Header Section */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                boxShadow: '0 8px 20px rgba(240, 147, 251, 0.4)',
              }}
            >
              <HistoryIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                }}
              >
                Review History
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Track all your AI-powered code reviews
              </Typography>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            <Grow in timeout={800}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  p: 2.5,
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {total}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Reviews
                </Typography>
              </Card>
            </Grow>
            <Grow in timeout={1000}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: 'white',
                  p: 2.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon />
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {total > 0 ? Math.round((successCount / total) * 100) : 0}%
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Success Rate
                </Typography>
              </Card>
            </Grow>
            <Grow in timeout={1200}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  p: 2.5,
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {totalComments}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Comments
                </Typography>
              </Card>
            </Grow>
          </Box>
        </Box>
      </Fade>

      {/* Table Card */}
      <Grow in timeout={1400}>
        <Card
          elevation={0}
          sx={{
            background: 'white',
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 50%, #667eea 100%)',
            },
          }}
        >
          <Box sx={{ p: 3 }}>
            <HistoryFilters
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              model={model}
              onModelChange={setModel}
              onClear={handleClearFilters}
            />

            <Box sx={{ height: 600, width: '100%' }}>
              {total === 0 && !loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    gap: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      opacity: 0.2,
                    }}
                  >
                    <HistoryIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary">
                    No reviews yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start your first review to see history here!
                  </Typography>
                </Box>
              ) : (
                <DataGrid
                  rows={reviews}
                  columns={columns}
                  rowCount={total}
                  loading={loading}
                  pageSizeOptions={[10, 20, 50]}
                  paginationModel={paginationModel}
                  paginationMode="server"
                  onPaginationModelChange={setPaginationModel}
                  disableRowSelectionOnClick
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell': {
                      display: 'flex',
                      alignItems: 'center',
                    },
                    '& .MuiDataGrid-cell:focus': {
                      outline: 'none',
                    },
                    '& .MuiDataGrid-row:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.04)',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      mb: 1,
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                      display: 'flex',
                      alignItems: 'center',
                    },
                  }}
                />
              )}
            </Box>
          </Box>
        </Card>
      </Grow>
      
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleDownload('pr.json')}>
          <ListItemIcon>
            <CodeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>PR Data (JSON)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('prompt.txt')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Full Prompt (TXT)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('system-prompt.txt')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>System Prompt (TXT)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('req-prompt.json')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Request Metadata (JSON)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('res-ai.json')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>AI Response (JSON)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('jira.json')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Jira Data (JSON)</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
