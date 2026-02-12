'use client';

import { useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText, Box, Chip, ListSubheader, Divider, Alert, Typography } from '@mui/material';
import { ALL_AI_MODELS, CLAUDE_MODELS, GEMINI_MODELS } from '@/lib/constants/models';
import { AppConfig } from '@/types/ai';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import SpeedIcon from '@mui/icons-material/Speed';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import WarningIcon from '@mui/icons-material/Warning';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  config: AppConfig;
  configLoading: boolean;
}

const modelIcons: Record<string, typeof AutoAwesomeIcon> = {
  // Claude models
  'claude-opus-4-6': AutoAwesomeIcon,
  'claude-sonnet-4-5-20250929': BoltIcon,
  'claude-haiku-4-5-20251001': SpeedIcon,
  // Gemini models
  'gemini-3-pro-preview': PsychologyIcon,
  'gemini-3-flash-preview': FlashOnIcon,
};

const modelGradients: Record<string, string> = {
  // Claude models - Purple/Pink gradient scheme
  'claude-opus-4-6': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

export function ModelSelector({ value, onChange, config, configLoading }: ModelSelectorProps) {
  const selectedModel = ALL_AI_MODELS.find((m) => m.id === value);

  const hasAnyApiKey = config.hasAnthropicKey || config.hasGeminiKey;

  // Auto-select first available model if current selection is not available
  useEffect(() => {
    if (configLoading || !hasAnyApiKey) {
      return; // Wait for config or no API keys at all
    }

    const currentModel = ALL_AI_MODELS.find((m) => m.id === value);
    const isCurrentModelAvailable =
      (currentModel?.provider === 'claude' && config.hasAnthropicKey) ||
      (currentModel?.provider === 'gemini' && config.hasGeminiKey);

    if (!isCurrentModelAvailable) {
      // Select first available model
      const firstAvailableModel = ALL_AI_MODELS.find(
        (m) =>
          (m.provider === 'claude' && config.hasAnthropicKey) ||
          (m.provider === 'gemini' && config.hasGeminiKey)
      );
      if (firstAvailableModel) {
        onChange(firstAvailableModel.id);
      }
    }
  }, [config, configLoading, value, onChange, hasAnyApiKey]);

  return (
    <>
      {!hasAnyApiKey && !configLoading && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <strong>No AI models available!</strong>
          <br />
          Configure at least one AI provider in your .env file:
          <br />
          • ANTHROPIC_API_KEY for Claude models
          <br />• GEMINI_API_KEY for Gemini models
        </Alert>
      )}

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
          disabled={!hasAnyApiKey}
          renderValue={(selected) => {
            const model = ALL_AI_MODELS.find((m) => m.id === selected);
            if (!model) return selected;
            const Icon = modelIcons[model.id];
            
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '6px',
                    background: modelGradients[model.id],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  {Icon && <Icon sx={{ fontSize: 18 }} />}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {model.name}
                </Typography>
                <Chip
                  label={`${model.maxTokens} tokens`}
                  size="small"
                  sx={{
                    ml: 'auto',
                    height: 20,
                    fontSize: '0.65rem',
                    background: 'rgba(0,0,0,0.05)',
                    display: { xs: 'none', sm: 'flex' }
                  }}
                />
              </Box>
            );
          }}
        >
          {/* Claude Models Section */}
          <ListSubheader
            sx={{
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              color: config.hasAnthropicKey ? '#764ba2' : '#999',
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
            {!config.hasAnthropicKey && (
              <Chip
                label="API key required"
                size="small"
                sx={{
                  ml: 'auto',
                  fontSize: '0.65rem',
                  height: 20,
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                }}
              />
            )}
          </ListSubheader>
          {CLAUDE_MODELS.map((model) => {
            const Icon = modelIcons[model.id];
            const isDisabled = !config.hasAnthropicKey;
            return (
              <MenuItem key={model.id} value={model.id} disabled={isDisabled}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', opacity: isDisabled ? 0.5 : 1 }}>
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
                    <Box sx={{ fontWeight: 600, mb: 0.5 }}>
                      {model.name}
                      {isDisabled && (
                        <Chip
                          label="Requires ANTHROPIC_API_KEY"
                          size="small"
                          sx={{
                            ml: 1,
                            fontSize: '0.65rem',
                            height: 18,
                            backgroundColor: '#f5f5f5',
                            color: '#666',
                          }}
                        />
                      )}
                    </Box>
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
              color: config.hasGeminiKey ? '#4285f4' : '#999',
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
            {!config.hasGeminiKey && (
              <Chip
                label="API key required"
                size="small"
                sx={{
                  ml: 'auto',
                  fontSize: '0.65rem',
                  height: 20,
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                }}
              />
            )}
          </ListSubheader>
          {GEMINI_MODELS.map((model) => {
            const Icon = modelIcons[model.id];
            const isDisabled = !config.hasGeminiKey;
            return (
              <MenuItem key={model.id} value={model.id} disabled={isDisabled}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', opacity: isDisabled ? 0.5 : 1 }}>
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
                    <Box sx={{ fontWeight: 600, mb: 0.5 }}>
                      {model.name}
                      {isDisabled && (
                        <Chip
                          label="Requires GEMINI_API_KEY"
                          size="small"
                          sx={{
                            ml: 1,
                            fontSize: '0.65rem',
                            height: 18,
                            backgroundColor: '#f5f5f5',
                            color: '#666',
                          }}
                        />
                      )}
                    </Box>
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
          {!hasAnyApiKey && !configLoading
            ? 'Configure at least one AI provider (Claude or Gemini) in .env'
            : !config.hasAnthropicKey && config.hasGeminiKey
            ? 'Using Gemini models (Claude models disabled - add ANTHROPIC_API_KEY to enable)'
            : config.hasAnthropicKey && !config.hasGeminiKey
            ? 'Using Claude models (Gemini models disabled - add GEMINI_API_KEY to enable)'
            : 'Choose Claude for complex reviews or Gemini for fast, cost-effective analysis'}
        </FormHelperText>
      </FormControl>
    </>
  );
}
