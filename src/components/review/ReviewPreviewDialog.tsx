'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
  Alert,
  Card,
  CardContent,
  Collapse,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CodeIcon from '@mui/icons-material/Code';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GitHubIcon from '@mui/icons-material/GitHub';
import { ReviewComment } from '@/types/review';

interface ReviewPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: (comments: ReviewComment[]) => void;
  onReject: () => void;
  comments: ReviewComment[];
  prTitle: string;
  prUrl: string;
  modelName: string;
  isSubmitting: boolean;
}

const severityConfig = {
  critical: {
    icon: ErrorIcon,
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.1)',
    label: 'Critical',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
  },
  warning: {
    icon: WarningIcon,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    label: 'Warning',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  suggestion: {
    icon: LightbulbIcon,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    label: 'Suggestion',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
};

export function ReviewPreviewDialog({
  open,
  onClose,
  onApprove,
  onReject,
  comments: initialComments,
  prTitle,
  prUrl,
  modelName,
  isSubmitting,
}: ReviewPreviewDialogProps) {
  const [comments, setComments] = useState<ReviewComment[]>(initialComments);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editedBody, setEditedBody] = useState<string>('');

  // Sync state with props when dialog opens or comments change
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments, open]);

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedComments(newExpanded);
  };

  const handleDelete = (index: number) => {
    setComments(comments.filter((_, i) => i !== index));
  };

  const handleEditStart = (index: number) => {
    setEditingComment(index);
    setEditedBody(comments[index].body);
  };

  const handleEditSave = (index: number) => {
    const updatedComments = [...comments];
    updatedComments[index] = { ...updatedComments[index], body: editedBody };
    setComments(updatedComments);
    setEditingComment(null);
    setEditedBody('');
  };

  const handleEditCancel = () => {
    setEditingComment(null);
    setEditedBody('');
  };

  const getSeverityCounts = () => {
    return comments.reduce(
      (acc, comment) => {
        acc[comment.severity] = (acc[comment.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  };

  const severityCounts = getSeverityCounts();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CheckCircleIcon />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Review Preview
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Review and approve before submitting to GitHub
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* PR Info Section */}
        <Box
          sx={{
            p: 3,
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <GitHubIcon sx={{ color: '#667eea' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {prTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {prUrl}
              </Typography>
            </Box>
            <Chip
              label={modelName}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>

          {/* Summary Stats */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`${comments.length} Comments`}
              size="small"
              sx={{ fontWeight: 600 }}
            />
            {Object.entries(severityCounts).map(([severity, count]) => {
              const config = severityConfig[severity as keyof typeof severityConfig];
              return (
                <Chip
                  key={severity}
                  icon={<config.icon sx={{ fontSize: 16 }} />}
                  label={`${count} ${config.label}`}
                  size="small"
                  sx={{
                    background: config.bgColor,
                    color: config.color,
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: config.color },
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Comments List */}
        <Box sx={{ p: 3, maxHeight: '50vh', overflow: 'auto' }}>
          {comments.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              No review comments to submit. The AI found no issues with this PR.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {comments.map((comment, index) => {
                const config = severityConfig[comment.severity as keyof typeof severityConfig];
                const isExpanded = expandedComments.has(index);
                const isEditing = editingComment === index;

                return (
                  <Card
                    key={index}
                    elevation={0}
                    sx={{
                      border: `1px solid ${config.color}30`,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: `${config.color}60`,
                        boxShadow: `0 4px 12px ${config.color}20`,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      {/* Comment Header */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          background: config.bgColor,
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleExpand(index)}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background: config.gradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                          }}
                        >
                          <config.icon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CodeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {comment.path}
                            </Typography>
                            <Chip
                              label={`Line ${comment.line}`}
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          </Box>
                        </Box>
                        <Chip
                          label={config.label}
                          size="small"
                          sx={{
                            background: config.gradient,
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </Box>

                      {/* Comment Body */}
                      <Collapse in={isExpanded}>
                        <Box sx={{ p: 2, borderTop: `1px solid ${config.color}20` }}>
                          {isEditing ? (
                            <Box>
                              <textarea
                                value={editedBody}
                                onChange={(e) => setEditedBody(e.target.value)}
                                style={{
                                  width: '100%',
                                  minHeight: '100px',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: '1px solid #e0e0e0',
                                  fontFamily: 'inherit',
                                  fontSize: '14px',
                                  resize: 'vertical',
                                }}
                              />
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleEditSave(index)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={handleEditCancel}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                              >
                                {comment.body}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                <Tooltip title="Edit comment">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditStart(index);
                                    }}
                                    sx={{ color: '#667eea' }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove comment">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(index);
                                    }}
                                    sx={{ color: '#dc2626' }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {comments.length > 0
            ? `${comments.length} comment(s) will be posted to GitHub`
            : 'No comments to post'}
        </Typography>
        <Button
          onClick={onReject}
          variant="outlined"
          color="error"
          disabled={isSubmitting}
          sx={{ borderRadius: '10px' }}
        >
          Cancel Review
        </Button>
        <Button
          onClick={() => onApprove(comments)}
          variant="contained"
          disabled={isSubmitting || comments.length === 0}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          sx={{
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
            },
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Approve & Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
