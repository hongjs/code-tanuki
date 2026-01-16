'use client';

import { FormControl, InputLabel, Select, MenuItem, FormHelperText, Box, Chip } from '@mui/material';
import { CLAUDE_MODELS } from '@/lib/constants/models';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import SpeedIcon from '@mui/icons-material/Speed';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const modelIcons = {
  'claude-opus-4-20250514': AutoAwesomeIcon,
  'claude-sonnet-4-20250514': BoltIcon,
  'claude-haiku-4-20250514': SpeedIcon,
};

const modelGradients = {
  'claude-opus-4-20250514': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'claude-sonnet-4-20250514': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'claude-haiku-4-20250514': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
};

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <FormControl
      fullWidth
      sx={{
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: '#667eea',
        },
      }}
    >
      <InputLabel id="model-select-label">Claude Model</InputLabel>
      <Select
        labelId="model-select-label"
        value={value}
        label="Claude Model"
        onChange={(e) => onChange(e.target.value)}
      >
        {CLAUDE_MODELS.map((model) => {
          const Icon = modelIcons[model.id as keyof typeof modelIcons];
          return (
            <MenuItem key={model.id} value={model.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: modelGradients[model.id as keyof typeof modelGradients],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  {Icon && <Icon />}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ fontWeight: 600, mb: 0.5 }}>{model.name}</Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {model.description}
                  </Box>
                </Box>
                <Chip
                  label={`${model.maxTokens} tokens`}
                  size="small"
                  sx={{
                    background: modelGradients[model.id as keyof typeof modelGradients],
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
            </MenuItem>
          );
        })}
      </Select>
      <FormHelperText>
        Choose the AI model based on your review complexity needs
      </FormHelperText>
    </FormControl>
  );
}
