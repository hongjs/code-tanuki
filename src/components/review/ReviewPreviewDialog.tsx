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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  useTheme,
  Avatar,
  Paper,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderIcon from '@mui/icons-material/Folder';
// import Markdown from 'react-markdown';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GitHubIcon from '@mui/icons-material/GitHub';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { ReviewComment } from '@/types/review';

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'header';
  content: string;
  oldLine?: number; // 1-based
  newLine?: number; // 1-based
}

interface ParsedFileDiff {
  path: string;
  lines: DiffLine[];
}

interface ReviewPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: (comments: ReviewComment[]) => void;
  onReject: () => void;
  comments: ReviewComment[];
  diff: string;
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
  diff: rawDiff,
  prTitle,
  prUrl,
  modelName,
  isSubmitting,
}: ReviewPreviewDialogProps) {
  const theme = useTheme();
  const [comments, setComments] = useState<ReviewComment[]>(initialComments);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editedBody, setEditedBody] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<Record<string, ParsedFileDiff>>({});

  // Parse diff when received
  useEffect(() => {
    if (!rawDiff) return;

    const parsed: Record<string, ParsedFileDiff> = {};
    const fileChunks = rawDiff.split('diff --git ');

    fileChunks.forEach((chunk) => {
      if (!chunk.trim()) return;

      // Robust filename extraction
      // Look for "+++ b/..." line which is standard in git diffs
      const plusPlusMatch = chunk.match(/\+\+\+ b\/(.+?)(?:\t|\n|$)/);
      // Fallback: look for "diff --git a/... b/..."
      const diffGitMatch = chunk.match(/diff --git a\/.*? b\/(.*?)(?:\n|$)/);
      // Fallback: look for generic "b/..." pattern at start
      const fallbackMatch = chunk.match(/^b\/(.+?)\n/m);

      const fileName = plusPlusMatch ? plusPlusMatch[1] : 
                       diffGitMatch ? diffGitMatch[1] : 
                       fallbackMatch ? fallbackMatch[1] : '';
      
      if (!fileName) {
        console.log('Failed to parse filename from chunk:', chunk.substring(0, 100));
        return;
      }

      console.log('Parsed diff for file:', fileName);

      const lines: DiffLine[] = [];
      const diffLines = chunk.split('\n');
      
      let oldLine = 0;
      let newLine = 0;
      let isHeader = true;

      diffLines.forEach((line) => {
        // Handle hunk header @@ -old,count +new,count @@
        if (line.startsWith('@@ ')) {
          isHeader = false;
          const metaMatch = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
          if (metaMatch) {
            oldLine = parseInt(metaMatch[1], 10) - 1;
            newLine = parseInt(metaMatch[2], 10) - 1;
          }
          lines.push({ type: 'header', content: line });
          return;
        }

        if (isHeader) {
          // Keep processing until we hit the first hunk or a line that looks like content
          return;
        }

        if (line.startsWith('+') && !line.startsWith('+++')) {
          newLine++;
          lines.push({ type: 'added', content: line.substring(1), newLine });
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          oldLine++;
          lines.push({ type: 'removed', content: line.substring(1), oldLine });
        } else if (!line.startsWith('+++') && !line.startsWith('---') && !line.startsWith('index ')) {
          oldLine++;
          newLine++;
          lines.push({ type: 'context', content: line.startsWith(' ') ? line.substring(1) : line, oldLine, newLine });
        }
      });

      parsed[fileName] = { path: fileName, lines };
    });

    setFileDiffs(parsed);
    
    // Auto-select first file if parsed
    const firstFile = Object.keys(parsed)[0];
    if (firstFile && !selectedFile) {
      setSelectedFile(firstFile);
    }
  }, [rawDiff]);

  // Group comments by file (from comments prop + fileDiffs keys)
  const files = Array.from(new Set([...comments.map((c) => c.path), ...Object.keys(fileDiffs)])).sort();
  const commentsByFile = comments.reduce(
    (acc, comment) => {
      acc[comment.path] = acc[comment.path] || [];
      acc[comment.path].push(comment);
      return acc;
    },
    {} as Record<string, ReviewComment[]>
  );
  
  // Calculate stats per file
  const fileStats = files.reduce((acc, file) => {
    acc[file] = (commentsByFile[file] || []).length;
    return acc;
  }, {} as Record<string, number>);

  // Sync state with props when dialog opens or comments change
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments, open]);



  const deleteComment = (commentToDelete: ReviewComment) => {
    setComments(comments.filter(c => c !== commentToDelete));
  };

  const handleEditStart = (index: number) => {
    setEditingComment(index);
    setEditedBody(comments[index].body);
  };

  const handleEditSave = (commentToUpdate: ReviewComment) => {
    setComments(comments.map(c => 
      c === commentToUpdate ? { ...c, body: editedBody } : c
    ));
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

  const renderComments = (commentsToRender: ReviewComment[]) => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: '#white' }}>
        {commentsToRender.map((comment, index) => {
          const config = severityConfig[comment.severity as keyof typeof severityConfig];
          const isEditing = editingComment === comments.indexOf(comment);

          return (
            <Paper
              key={comments.indexOf(comment)}
              elevation={0}
              sx={{
                border: '1px solid #d0d7de',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              {/* GitHub-style Header */}
              <Box
                sx={{
                  bgcolor: '#f6f8fa',
                  borderBottom: '1px solid #d0d7de',
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 20, 
                      height: 20, 
                      bgcolor: config.color,
                      fontSize: '0.8rem'
                    }}
                  >
                    <SmartToyIcon sx={{ fontSize: 14 }} />
                  </Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#24292e' }}>
                    codeowl-ai
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#586069' }}>
                    suggested changes
                  </Typography>
                  <Chip
                    label={`Line ${comment.line}`}
                    size="small"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem', 
                      bgcolor: 'rgba(27, 31, 35, 0.08)',
                      color: '#24292e',
                      fontWeight: 600
                    }}
                  />
                   <Chip
                    icon={<config.icon sx={{ fontSize: '14px !important' }} />}
                    label={config.label}
                    size="small"
                    sx={{
                      height: 20,
                      bgcolor: config.bgColor,
                      color: config.color,
                      border: `1px solid ${config.color}40`,
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      '& .MuiChip-icon': { color: config.color },
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Edit comment">
                    <IconButton
                      size="small"
                      onClick={() => handleEditStart(comments.indexOf(comment))}
                      sx={{ color: '#586069' }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete comment">
                    <IconButton
                      size="small"
                      onClick={() => deleteComment(comment)}
                      sx={{ color: '#cb2431' }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Content */}
              <Box sx={{ p: 2, bgcolor: 'white' }}>
                 {isEditing ? (
                  <Box>
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #d0d7de',
                        fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        marginBottom: '10px',
                        background: '#f6f8fa',
                        color: '#24292e',
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleEditCancel}
                        sx={{ textTransform: 'none', color: '#24292e', borderColor: '#d0d7de' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleEditSave(comment)}
                        sx={{ textTransform: 'none', bgcolor: '#2da44e', '&:hover': { bgcolor: '#2c974b' } }}
                      >
                        Update comment
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box className="markdown-body">
                    {/* Only show path if not rendering in diff view where path is obvious */}
                    {!rawDiff && (
                      <Typography variant="caption" display="block" sx={{ mb: 1, color: '#586069', fontFamily: 'monospace' }}>
                        {comment.path}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ color: '#24292e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                       {comment.body}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onReject}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          height: '90vh',
          bgcolor: '#fff',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: '#24292e',
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
        <IconButton onClick={onReject} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', height: '80vh', overflow: 'hidden' }}>
        {/* Sidebar - File Tree */}
        <Box
          sx={{
            width: 300,
            borderRight: '1px solid #e0e0e0',
            bgcolor: '#f6f8fa',
            overflowY: 'auto',
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Files Changed ({files.length})
            </Typography>
          </Box>
          <List dense sx={{ p: 0 }}>
            <ListItemButton
              selected={selectedFile === null}
              onClick={() => setSelectedFile(null)}
              sx={{ '&.Mui-selected': { bgcolor: 'white', borderLeft: '3px solid #667eea' } }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <FolderIcon sx={{ color: selectedFile === null ? '#667eea' : 'text.secondary', fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText 
                primary="All Files" 
                primaryTypographyProps={{ fontWeight: selectedFile === null ? 600 : 400 }}
              />
              <Badge badgeContent={comments.length} color="primary" sx={{ '& .MuiBadge-badge': { bgcolor: '#667eea' } }} />
            </ListItemButton>
          
            {files.map((file) => (
              <ListItemButton
                key={file}
                selected={selectedFile === file}
                onClick={() => setSelectedFile(file)}
                sx={{ '&.Mui-selected': { bgcolor: 'white', borderLeft: '3px solid #667eea' } }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <InsertDriveFileIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={file.split('/').pop()} 
                  secondary={file}
                  secondaryTypographyProps={{ 
                    noWrap: true, 
                    fontSize: '0.7rem', 
                    title: file 
                  }}
                  primaryTypographyProps={{ 
                    fontWeight: selectedFile === file ? 600 : 400,
                    fontSize: '0.9rem'
                  }}
                />
                {fileStats[file] > 0 && (
                  <Box
                    sx={{
                      bgcolor: '#e1e4e8',
                      color: '#24292e',
                      borderRadius: '10px',
                      px: 0.8,
                      py: 0.2,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    {fileStats[file]}
                  </Box>
                )}
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Main Content - Comments & Code */}
        <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#f1f1f1', p: 3 }}>
          {selectedFile && (
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
               <Typography variant="h6" sx={{ color: '#24292e', fontWeight: 600 }}>
                 {selectedFile}
               </Typography>
             </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {selectedFile && fileDiffs[selectedFile] ? (
              <Paper sx={{ border: '1px solid #d0d7de', borderRadius: '6px', overflow: 'hidden' }}>
                <Box component="pre" sx={{ m: 0, p: 0, fontFamily: 'monospace', fontSize: '12px' }}>
                  {fileDiffs[selectedFile].lines.map((line, lineIdx) => {
                    // Match comments based on new file line numbers
                    // For removed lines, we check if there's a comment for the line right after
                    const lineComments = comments.filter(c => {
                      if (c.path !== selectedFile) return false;

                      // For added or context lines, match against newLine
                      if (line.newLine && c.line === line.newLine) return true;

                      // For removed lines without a newLine, try matching adjacent context
                      // (GitHub's API doesn't allow direct comments on removed-only lines)
                      return false;
                    });

                    return (
                      <Box key={lineIdx}>
                        <Box sx={{ 
                          display: 'flex', 
                          bgcolor: line.type === 'added' ? '#e6ffec' : line.type === 'removed' ? '#ffebe9' : line.type === 'header' ? '#fbf1ff' : 'white',
                          '&:hover': { bgcolor: line.type === 'added' ? '#acf2bd' : line.type === 'removed' ? '#ffdce0' : '#f6f8fa' }
                        }}>
                          <Box sx={{ 
                            width: 50, 
                            textAlign: 'right', 
                            pr: 1, 
                            userSelect: 'none', 
                            color: '#ccc', 
                            borderRight: '1px solid #eee',
                            bgcolor: '#f6f8fa'
                          }}>
                            {line.oldLine || ''}
                          </Box>
                          <Box sx={{ 
                            width: 50, 
                            textAlign: 'right', 
                            pr: 1, 
                            userSelect: 'none', 
                            color: '#ccc', 
                            borderRight: '1px solid #eee',
                            bgcolor: '#f6f8fa' 
                          }}>
                            {line.newLine || ''}
                          </Box>
                          <Box sx={{ px: 1, flex: 1, overflowX: 'auto' }}>
                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} {line.content}
                          </Box>
                        </Box>

                        {/* Render Comments for this line */}
                        {lineComments.length > 0 && (
                          <Box sx={{ borderTop: '1px solid #d0d7de', borderBottom: '1px solid #d0d7de' }}>
                             {renderComments(lineComments)}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            ) : (
              // Fallback if no diff available for selected file
              renderComments(comments.filter(c => !selectedFile || c.path === selectedFile))
            )}
          </Box>
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
