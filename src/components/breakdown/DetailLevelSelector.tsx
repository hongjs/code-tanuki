'use client';

import { ToggleButton, ToggleButtonGroup, Tooltip, Box, Typography } from '@mui/material';

interface Props {
  value: 'detailed' | 'balanced' | 'minimal';
  onChange: (value: 'detailed' | 'balanced' | 'minimal') => void;
  disabled?: boolean;
}

const levels = [
  {
    value: 'detailed' as const,
    label: 'Detailed',
    tooltip: 'Comprehensive technical specs, edge cases, performance considerations, and exhaustive test scenarios. Best for complex features.',
  },
  {
    value: 'balanced' as const,
    label: 'Balanced',
    tooltip: 'Key technical points with practical test coverage. Good for most features.',
  },
  {
    value: 'minimal' as const,
    label: 'Minimal',
    tooltip: 'Essential requirements only with basic test coverage. Best for small tasks.',
  },
];

export function DetailLevelSelector({ value, onChange, disabled }: Props) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        Detail Level
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, newValue) => {
          if (newValue) onChange(newValue);
        }}
        disabled={disabled}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            textTransform: 'none',
            px: 2,
            py: 0.75,
            fontSize: '0.8rem',
            fontWeight: 500,
          },
          '& .Mui-selected': {
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important',
            color: 'white !important',
          },
        }}
      >
        {levels.map((level) => (
          <Tooltip key={level.value} title={level.tooltip} placement="top" arrow>
            <ToggleButton value={level.value}>{level.label}</ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
