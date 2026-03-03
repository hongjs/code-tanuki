'use client';

import { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import {
  Box,
  Chip,
  Link as MuiLink,
  Typography,
  Card,
  Avatar,
  Fade,
  Grow,
  IconButton,
} from '@mui/material';
import { format } from 'date-fns';
import HistoryIcon from '@mui/icons-material/History';
import ArticleIcon from '@mui/icons-material/Article';
import CodeIcon from '@mui/icons-material/Code';
import LaunchIcon from '@mui/icons-material/Launch';
import { ReviewV2IndexEntry } from '@/types/review-v2';
import { useRouter } from 'next/navigation';

export function CodeReviewV2List() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewV2IndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reviews-v2');
      const data = await response.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch v2 reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return { bg: '#dcfce7', text: '#14532d' };
      case 'posted': return { bg: '#dbeafe', text: '#1e3a8a' };
      case 'error': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#fef3c7', text: '#92400e' }; // pending
    }
  };

  const columns: GridColDef<ReviewV2IndexEntry>[] = [
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
          <CodeIcon sx={{ fontSize: 18, color: '#6366f1' }} />
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
          onClick={(e) => e.stopPropagation()}
          sx={{
            fontWeight: 600,
            color: '#6366f1',
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
      width: 250,
      flex: 1,
      renderCell: (params) => (
        <Typography
          variant="body2"
          title={params.row.summary || params.value}
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
              backgroundColor: '#fdf2f8',
              color: '#9d174d',
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
      width: 120,
      renderCell: (params) => {
        const colors = getStatusColor(params.value);
        return (
          <Chip
            label={params.value.toUpperCase()}
            size="small"
            sx={{ backgroundColor: colors.bg, color: colors.text, fontWeight: 700, fontSize: '0.7rem' }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Review',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton 
          size="small" 
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/code-review-v2/${params.row.id}`);
          }}
        >
          <LaunchIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
              }}
            >
              <ArticleIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  color: '#312e81',
                }}
              >
                Code Review v2
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and approve code reviews generated by the Claude Code Local Agent
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

      <Grow in timeout={800}>
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
              background: 'linear-gradient(90deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
            },
          }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ height: 600, width: '100%' }}>
              {reviews.length === 0 && !loading ? (
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
                  <Avatar sx={{ width: 80, height: 80, backgroundColor: '#f1f5f9', color: '#94a3b8' }}>
                    <HistoryIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary">
                    No generated reviews yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Run the Claude Code agent to generate local reviews first.
                  </Typography>
                </Box>
              ) : (
                <DataGrid
                  rows={reviews}
                  columns={columns}
                  loading={loading}
                  pageSizeOptions={[10, 20, 50]}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  disableRowSelectionOnClick
                  onRowClick={(params) => router.push(`/code-review-v2/${params.row.id}`)}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-row': { cursor: 'pointer' },
                    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', outline: 'none' },
                    '& .MuiDataGrid-cell:focus': { outline: 'none' },
                    '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(99, 102, 241, 0.04)' },
                    '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', borderRadius: '8px', mb: 1 },
                  }}
                />
              )}
            </Box>
          </Box>
        </Card>
      </Grow>
    </Box>
  );
}
