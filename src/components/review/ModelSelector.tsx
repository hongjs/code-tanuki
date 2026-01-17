'use client';

import { FormControl, InputLabel, Select, MenuItem, FormHelperText, Box, Chip, ListSubheader, Divider } from '@mui/material';
import { ALL_AI_MODELS, CLAUDE_MODELS, GEMINI_MODELS } from '@/lib/constants/models';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import SpeedIcon from '@mui/icons-material/Speed';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const modelIcons: Record<string, typeof AutoAwesomeIcon> = {
  // Claude models
  'claude-opus-4-5-20251101': AutoAwesomeIcon,
  'claude-sonnet-4-5-20250929': BoltIcon,
  'claude-haiku-4-5-20251001': SpeedIcon,
  // Gemini models
  'gemini-3-pro-preview': PsychologyIcon,
  'gemini-3-flash-preview': FlashOnIcon,
};

const modelGradients: Record<string, string> = {
  // Claude models - Purple/Pink gradient scheme
  'claude-opus-4-5-20251101': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'claude-sonnet-4-5-20250929': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'claude-haiku-4-5-20251001': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  // Gemini models - Blue/Green gradient scheme
  'gemini-3-pro-preview': 'linear-gradient(135deg, #ea4335 0%, #fbbc05 100%)',
  'gemini-3-flash-preview': 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
};

const providerColors = {
  claude: '#764ba2',
  gemini: '#4285f4',
};

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const selectedModel = ALL_AI_MODELS.find((m) => m.id === value);

  return (
    <FormControl
      fullWidth
      sx={{
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: selectedModel?.provider === 'gemini' ? '#4285f4' : '#667eea',
        },
      }}
    >
      <InputLabel id="model-select-label">AI Model</InputLabel>
      <Select
        labelId="model-select-label"
        value={value}
        label="AI Model"
        onChange={(e) => onChange(e.target.value)}
      >
        {/* Claude Models Section */}
        <ListSubheader
          sx={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            color: '#764ba2',
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 1.5,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 18 }} /> Claude (Anthropic)
        </ListSubheader>
        {CLAUDE_MODELS.map((model) => {
          const Icon = modelIcons[model.id];
          return (
            <MenuItem key={model.id} value={model.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: modelGradients[model.id],
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
                    background: modelGradients[model.id],
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
            </MenuItem>
          );
        })}

        <Divider sx={{ my: 1 }} />

        {/* Gemini Models Section */}
        <ListSubheader
          sx={{
            background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.1) 0%, rgba(52, 168, 83, 0.1) 100%)',
            color: '#4285f4',
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 1.5,
          }}
        >
          <PsychologyIcon sx={{ fontSize: 18 }} /> Gemini (Google)
        </ListSubheader>
        {GEMINI_MODELS.map((model) => {
          const Icon = modelIcons[model.id];
          return (
            <MenuItem key={model.id} value={model.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: modelGradients[model.id],
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
                    background: modelGradients[model.id],
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
        Choose Claude for complex reviews or Gemini for fast, cost-effective analysis
      </FormHelperText>
    </FormControl>
  );
}
