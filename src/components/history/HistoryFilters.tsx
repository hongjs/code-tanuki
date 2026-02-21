'use client';

import { Box, TextField, Select, MenuItem, FormControl, InputLabel, Button, Chip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { ALL_AI_MODELS } from '@/lib/constants/models';

interface HistoryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  onClear: () => void;
}

export function HistoryFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  model,
  onModelChange,
  onClear,
}: HistoryFiltersProps) {
  const hasActiveFilters = search || status || model;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        mb: 3,
        flexWrap: 'wrap',
        alignItems: 'center',
        p: 2,
        borderRadius: '12px',
        background: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
      }}
    >
      <Chip
        icon={<FilterListIcon sx={{ fontSize: '16px !important', color: '#6366f1 !important' }} />}
        label="Filters"
        sx={{
          backgroundColor: '#eef2ff',
          color: '#4338ca',
          fontWeight: 600,
          '& .MuiChip-icon': { color: '#6366f1' },
        }}
      />

      <TextField
        placeholder="Search PR, repo, or ticket..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        sx={{
          minWidth: 280,
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#a5b4fc',
          },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#6366f1',
          },
        }}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: '#a5b4fc', fontSize: 20 }} />,
        }}
      />

      <FormControl
        size="small"
        sx={{
          minWidth: 150,
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#a5b4fc',
          },
        }}
      >
        <InputLabel>Status</InputLabel>
        <Select value={status} onChange={(e) => onStatusChange(e.target.value)} label="Status">
          <MenuItem value="">All</MenuItem>
          <MenuItem value="success">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#86efac',
                }}
              />
              Success
            </Box>
          </MenuItem>
          <MenuItem value="error">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#fca5a5',
                }}
              />
              Error
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      <FormControl
        size="small"
        sx={{
          minWidth: 200,
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#a5b4fc',
          },
        }}
      >
        <InputLabel>Model</InputLabel>
        <Select value={model} onChange={(e) => onModelChange(e.target.value)} label="Model">
          <MenuItem value="">All Models</MenuItem>
          {ALL_AI_MODELS.map((m) => (
            <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {hasActiveFilters && (
        <Button
          startIcon={<ClearIcon />}
          onClick={onClear}
          size="small"
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            color: '#6366f1',
            '&:hover': {
              background: 'rgba(99, 102, 241, 0.08)',
            },
          }}
        >
          Clear Filters
        </Button>
      )}
    </Box>
  );
}
