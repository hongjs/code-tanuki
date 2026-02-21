'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { TicketType } from '@/types/ticket';

interface TicketFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  type: TicketType | '';
  onTypeChange: (value: TicketType | '') => void;
  status: string;
  onStatusChange: (value: string) => void;
  onClear: () => void;
}

const TICKET_TYPES: TicketType[] = ['Epic', 'Story', 'Task', 'Sub-task', 'Bug'];
const TICKET_STATUSES = ['To Do', 'In Progress', 'Done'];

export function TicketFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  status,
  onStatusChange,
  onClear,
}: TicketFiltersProps) {
  const [inputValue, setInputValue] = useState(search);

  // Sync external reset (e.g. "Clear" button)
  useEffect(() => {
    setInputValue(search);
  }, [search]);

  // Debounce: fire onSearchChange 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(inputValue);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters = search || type || status;

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
        placeholder="Search title, Jira key..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        size="small"
        sx={{
          minWidth: 260,
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

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Type</InputLabel>
        <Select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as TicketType | '')}
          label="Type"
        >
          <MenuItem value="">All Types</MenuItem>
          {TICKET_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Status</InputLabel>
        <Select value={status} onChange={(e) => onStatusChange(e.target.value)} label="Status">
          <MenuItem value="">All Statuses</MenuItem>
          {TICKET_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
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
            '&:hover': { background: 'rgba(99, 102, 241, 0.08)' },
          }}
        >
          Clear
        </Button>
      )}
    </Box>
  );
}
