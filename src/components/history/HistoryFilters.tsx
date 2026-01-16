'use client';

import { Box, TextField, Select, MenuItem, FormControl, InputLabel, Button, Chip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';

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
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
        border: '1px solid rgba(102, 126, 234, 0.1)',
      }}
    >
      <Chip
        icon={<FilterListIcon />}
        label="Filters"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 600,
        }}
      />

      <TextField
        placeholder="Search PR, repo, or ticket..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        sx={{ minWidth: 280 }}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: '#667eea' }} />,
        }}
      />

      <FormControl
        size="small"
        sx={{
          minWidth: 150,
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#667eea',
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
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
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
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
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
            borderColor: '#667eea',
          },
        }}
      >
        <InputLabel>Model</InputLabel>
        <Select value={model} onChange={(e) => onModelChange(e.target.value)} label="Model">
          <MenuItem value="">All Models</MenuItem>
          <MenuItem value="claude-opus-4-20250514">Claude Opus 4</MenuItem>
          <MenuItem value="claude-sonnet-4-20250514">Claude Sonnet 4</MenuItem>
          <MenuItem value="claude-haiku-4-20250514">Claude Haiku 4</MenuItem>
          <MenuItem value="gemini-2.0-flash">Gemini 2.0 Flash</MenuItem>
          <MenuItem value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</MenuItem>
          <MenuItem value="gemini-1.5-pro">Gemini 1.5 Pro</MenuItem>
          <MenuItem value="gemini-1.5-flash">Gemini 1.5 Flash</MenuItem>
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
            color: '#667eea',
            '&:hover': {
              background: 'rgba(102, 126, 234, 0.1)',
            },
          }}
        >
          Clear Filters
        </Button>
      )}
    </Box>
  );
}
