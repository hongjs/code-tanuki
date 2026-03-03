'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
  Alert,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Paper,
  Tooltip,
  Button,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderIcon from '@mui/icons-material/Folder';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GitHubIcon from '@mui/icons-material/GitHub';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { ReviewComment } from '@/types/review';
import { ReviewV2Detail } from '@/types/review-v2';

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'header';
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface ParsedFileDiff {
  path: string;
  lines: DiffLine[];
}

const severityConfig = {
  critical: { icon: ErrorIcon, color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.1)', label: 'Critical' },
  warning: { icon: WarningIcon, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', label: 'Warning' },
  suggestion: { icon: LightbulbIcon, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', label: 'Suggestion' },
};

function parseSuggestion(body: string) {
  const suggestionMatch = body.match(/```suggestion\n([\s\S]*?)```/);
  if (suggestionMatch) {
    return {
      text: body.substring(0, body.indexOf('```suggestion')).trim(),
      suggestion: suggestionMatch[1],
    };
  }
  return { text: body, suggestion: null };
}

function getOriginalCodeFromDiff(
  fileDiff: ParsedFileDiff | undefined,
  startLine: number | undefined,
  endLine: number
) {
  if (!fileDiff) return [];
  const start = startLine || endLine;
  const lines: string[] = [];
  for (const line of fileDiff.lines) {
    if (line.newLine && line.newLine >= start && line.newLine <= endLine) {
      lines.push(line.content);
    }
  }
  return lines;
}
export function CodeReviewV2Detail({ id }: { id: string }) {
  const router = useRouter();
  const [review, setReview] = useState<ReviewV2Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');

  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [rawDiff, setRawDiff] = useState<string>('');
  const [fileDiffs, setFileDiffs] = useState<Record<string, ParsedFileDiff>>({});
  
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editedBody, setEditedBody] = useState<string>('');
  const [savingComments, setSavingComments] = useState(false);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const response = await fetch(`/api/reviews-v2/${id}`);
        if (!response.ok) throw new Error('Failed to fetch review');
        const data = await response.json();
        setReview(data);
        setComments(data.comments || []);
        
        // Fetch PR diff if PR URL is available
        if (data.prUrl) {
          try {
            const prResponse = await fetch(`/api/github/pr?url=${encodeURIComponent(data.prUrl)}`);
            if (prResponse.ok) {
              const prData = await prResponse.json();
              setRawDiff(prData.diff || '');
            } else {
              console.warn('Failed to load PR diff data');
            }
          } catch (diffErr) {
            console.error('Error fetching PR diff', diffErr);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [id]);

  // Parse diff when received
  useEffect(() => {
    if (!rawDiff) return;

    const parsed: Record<string, ParsedFileDiff> = {};
    const fileChunks = rawDiff.split('diff --git ');

    fileChunks.forEach((chunk) => {
      if (!chunk.trim()) return;

      const plusPlusMatch = chunk.match(/\+\+\+ b\/(.+?)(?:\t|\n|$)/);
      const diffGitMatch = chunk.match(/diff --git a\/.*? b\/(.*?)(?:\n|$)/);
      const fallbackMatch = chunk.match(/^b\/(.+?)\n/m);

      const fileName = plusPlusMatch ? plusPlusMatch[1] : 
                       diffGitMatch ? diffGitMatch[1] : 
                       fallbackMatch ? fallbackMatch[1] : '';
      
      if (!fileName) return;

      const lines: DiffLine[] = [];
      const diffLines = chunk.split('\n');
      
      let oldLine = 0;
      let newLine = 0;
      let isHeader = true;

      diffLines.forEach((line) => {
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

        if (isHeader) return;

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
  }, [rawDiff]);

  const files = Array.from(new Set([...comments.map((c) => c.path), ...Object.keys(fileDiffs)])).sort();
  const commentsByFile = comments.reduce((acc, comment) => {
    acc[comment.path] = acc[comment.path] || [];
    acc[comment.path].push(comment);
    return acc;
  }, {} as Record<string, ReviewComment[]>);

  const fileStats = files.reduce((acc, file) => {
    acc[file] = (commentsByFile[file] || []).length;
    return acc;
  }, {} as Record<string, number>);

  const saveUpdatedComments = async (updatedComments: ReviewComment[]) => {
    setSavingComments(true);
    try {
      const response = await fetch(`/api/reviews-v2/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: updatedComments })
      });
      if (!response.ok) throw new Error('Failed to save comments');
      setComments(updatedComments);
    } catch (err: any) {
      setError('Failed to save your edit: ' + err.message);
    } finally {
      setSavingComments(false);
    }
  };

  const deleteComment = async (commentToDelete: ReviewComment) => {
    const updatedComments = comments.filter(c => c !== commentToDelete);
    await saveUpdatedComments(updatedComments);
  };

  const handleEditStart = (index: number) => {
    setEditingComment(index);
    setEditedBody(comments[index].body);
  };

  const handleEditSave = async (commentToUpdate: ReviewComment) => {
    const updatedComments = comments.map(c => 
      c === commentToUpdate ? { ...c, body: editedBody } : c
    );
    await saveUpdatedComments(updatedComments);
    setEditingComment(null);
    setEditedBody('');
  };

  const handleEditCancel = () => {
    setEditingComment(null);
    setEditedBody('');
  };

  const handleApprove = async () => {
    if (!review) return;
    setApproving(true);
    try {
      const response = await fetch(`/api/reviews-v2/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }
      setReview({ ...review, status: 'posted' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  const renderComments = (commentsToRender: ReviewComment[]) => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
        {commentsToRender.map((comment, index) => {
          const config = severityConfig[comment.severity as keyof typeof severityConfig] || severityConfig.suggestion;

          const { text, suggestion } = parseSuggestion(comment.body);
          const originalLines = getOriginalCodeFromDiff(
            fileDiffs[comment.path],
            comment.start_line,
            comment.line
          );
          const suggestionLines = suggestion ? suggestion.split('\n').filter((l, i, arr) =>
            !(i === arr.length - 1 && l === '')
          ) : [];
          const startLineNum = comment.start_line || comment.line;

          return (
            <Paper
              key={index}
              elevation={0}
              sx={{ border: '1px solid #d0d7de', borderRadius: '6px', overflow: 'hidden' }}
            >
              <Box sx={{ bgcolor: '#f6f8fa', borderBottom: '1px solid #d0d7de', px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: config.color, fontSize: '0.8rem' }}>
                    <SmartToyIcon sx={{ fontSize: 14 }} />
                  </Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#24292e' }}>codetanuki-ai</Typography>
                  <Chip label={`Line ${comment.line}`} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(27, 31, 35, 0.08)' }} />
                  <Chip
                    label={config.label}
                    size="small"
                    sx={{ height: 20, bgcolor: config.bgColor, color: config.color, border: `1px solid ${config.color}40`, fontWeight: 600, fontSize: '0.7rem' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Edit comment">
                    <IconButton
                      size="small"
                      onClick={() => handleEditStart(comments.indexOf(comment))}
                      sx={{ color: '#586069' }}
                      disabled={savingComments || review?.status === 'posted'}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete comment">
                    <IconButton
                      size="small"
                      onClick={() => deleteComment(comment)}
                      sx={{ color: '#cb2431' }}
                      disabled={savingComments || review?.status === 'posted'}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'white' }}>
                {editingComment === comments.indexOf(comment) ? (
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
                      disabled={savingComments}
                    />
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleEditCancel}
                        sx={{ textTransform: 'none', color: '#24292e', borderColor: '#d0d7de' }}
                        disabled={savingComments}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleEditSave(comment)}
                        sx={{ textTransform: 'none', bgcolor: '#2da44e', '&:hover': { bgcolor: '#2c974b' } }}
                        disabled={savingComments}
                      >
                        {savingComments ? <CircularProgress size={20} color="inherit" /> : 'Save'}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box className="markdown-body">
                    {!rawDiff && (
                      <Typography variant="caption" display="block" sx={{ mb: 1, color: '#586069', fontFamily: 'monospace' }}>
                        {comment.path}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ color: '#24292e', lineHeight: 1.6, whiteSpace: 'pre-wrap', mb: suggestion ? 2 : 0 }}>
                      {text}
                    </Typography>
                    
                    {suggestion && (
                      <Box sx={{ border: '1px solid #d0d7de', borderRadius: '6px', overflow: 'hidden', mt: 1 }}>
                        <Box sx={{ bgcolor: '#f6f8fa', px: 2, py: 1, borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#24292e' }}>
                            Suggested change
                          </Typography>
                        </Box>
                        <Box sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {originalLines.map((line, idx) => (
                            <Box key={`removed-${idx}`} sx={{ display: 'flex', bgcolor: '#ffebe9', borderBottom: '1px solid #ffcecb' }}>
                              <Box sx={{ width: 50, textAlign: 'right', pr: 1, color: '#cf222e', bgcolor: '#ffcecb', userSelect: 'none', borderRight: '1px solid #ffcecb' }}>
                                {startLineNum + idx}
                              </Box>
                              <Box sx={{ width: 20, textAlign: 'center', color: '#cf222e', fontWeight: 'bold' }}>-</Box>
                              <Box sx={{ px: 1, flex: 1, color: '#24292e' }}>{line}</Box>
                            </Box>
                          ))}
                          {suggestionLines.map((line, idx) => (
                            <Box key={`added-${idx}`} sx={{ display: 'flex', bgcolor: '#e6ffec', borderBottom: idx < suggestionLines.length - 1 ? '1px solid #aceebb' : 'none' }}>
                              <Box sx={{ width: 50, textAlign: 'right', pr: 1, color: '#1a7f37', bgcolor: '#aceebb', userSelect: 'none', borderRight: '1px solid #aceebb' }}>
                                {startLineNum + idx}
                              </Box>
                              <Box sx={{ width: 20, textAlign: 'center', color: '#1a7f37', fontWeight: 'bold' }}>+</Box>
                              <Box sx={{ px: 1, flex: 1, color: '#24292e' }}>{line}</Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (!review) return <Box sx={{ p: 4 }}><Alert severity="error">Review not found</Alert></Box>;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/code-review-v2')}><ArrowBackIcon /></IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {review.prTitle || `Review for PR #${review.prNumber}`}
              </Typography>
              <Chip label={review.status.toUpperCase()} color={review.status === 'posted' ? 'success' : 'default'} size="small" />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GitHubIcon sx={{ fontSize: 16 }} />
                <a href={review.prUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } } as any}>
                  {review.repository}#{review.prNumber}
                </a>
              </Typography>
              {review.jiraTicketId && (
                <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box component="span" sx={{ fontWeight: 600, color: '#0052CC' }}>JIRA</Box>
                  <a href={`https://pi-financial.atlassian.net/browse/${review.jiraTicketId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } } as any}>
                    {review.jiraTicketId}
                  </a>
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
        {review.status !== 'posted' && (
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleApprove} 
            disabled={approving || comments.length === 0}
            startIcon={approving ? <CircularProgress size={20} color="inherit" /> : <GitHubIcon />}
            sx={{ fontWeight: 600, px: 3, boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
          >
            Approve & Post to GitHub
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ display: 'flex', flex: 1, overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: '12px' }}>
        {/* Sidebar */}
        <Box sx={{ width: 300, borderRight: '1px solid #e0e0e0', bgcolor: '#f6f8fa', overflowY: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, bgcolor: '#f6f8fa', zIndex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Files Changed ({files.length})</Typography>
          </Box>
          <List dense sx={{ p: 0 }}>
            <ListItemButton
              selected={selectedFile === null}
              onClick={() => setSelectedFile(null)}
              sx={{ '&.Mui-selected': { bgcolor: 'white', borderLeft: '3px solid #667eea' } }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}><FolderIcon sx={{ color: selectedFile === null ? '#667eea' : 'text.secondary', fontSize: 18 }} /></ListItemIcon>
              <ListItemText primary="All Files" primaryTypographyProps={{ fontWeight: selectedFile === null ? 600 : 400 }} />
              <Badge badgeContent={comments.length} color="primary" sx={{ '& .MuiBadge-badge': { bgcolor: '#667eea' } }} />
            </ListItemButton>
          
            {files.map((file) => (
              <ListItemButton
                key={file}
                selected={selectedFile === file}
                onClick={() => setSelectedFile(file)}
                sx={{ '&.Mui-selected': { bgcolor: 'white', borderLeft: '3px solid #667eea' } }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}><InsertDriveFileIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></ListItemIcon>
                <ListItemText 
                  primary={file.split('/').pop()} 
                  secondary={file}
                  secondaryTypographyProps={{ noWrap: true, fontSize: '0.7rem' }}
                  primaryTypographyProps={{ fontWeight: selectedFile === file ? 600 : 400, fontSize: '0.9rem' }}
                />
                {fileStats[file] > 0 && (
                  <Box sx={{ bgcolor: '#e1e4e8', color: '#24292e', borderRadius: '10px', px: 0.8, py: 0.2, fontSize: '0.7rem', fontWeight: 600 }}>{fileStats[file]}</Box>
                )}
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Main */}
        <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#f1f1f1', p: 3, display: 'flex', flexDirection: 'column' }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
             <Typography variant="h6" sx={{ color: '#24292e', fontWeight: 600 }}>{selectedFile || 'All Comments'}</Typography>
           </Box>

           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
             {selectedFile && fileDiffs[selectedFile] ? (
               <Paper sx={{ border: '1px solid #d0d7de', borderRadius: '6px', overflow: 'hidden', bgcolor: 'white' }}>
                 <Box component="pre" sx={{ m: 0, p: 0, fontFamily: 'monospace', fontSize: '12px' }}>
                    {(() => {
                      const renderedCommentIds = new Set<string>();
                      const lines = fileDiffs[selectedFile].lines;
                      
                      const diffContent = lines.map((line, lineIdx) => {
                        const lineComments = comments.filter(c => {
                          if (c.path !== selectedFile) return false;
                          if (line.newLine && c.line === line.newLine) return true;
                          return false;
                        });

                        lineComments.forEach(c => {
                          renderedCommentIds.add(`${c.path}-${c.line}-${c.body.substring(0, 30)}`);
                        });

                        return (
                          <Box key={lineIdx}>
                            <Box sx={{ 
                              display: 'flex', 
                              bgcolor: line.type === 'added' ? '#e6ffec' : line.type === 'removed' ? '#ffebe9' : line.type === 'header' ? '#fbf1ff' : 'white',
                              '&:hover': { bgcolor: line.type === 'added' ? '#acf2bd' : line.type === 'removed' ? '#ffdce0' : '#f6f8fa' }
                            }}>
                              <Box sx={{ width: 50, textAlign: 'right', pr: 1, userSelect: 'none', color: '#aaa', borderRight: '1px solid #eee', bgcolor: '#f6f8fa' }}>
                                {line.oldLine || ''}
                              </Box>
                              <Box sx={{ width: 50, textAlign: 'right', pr: 1, userSelect: 'none', color: '#aaa', borderRight: '1px solid #eee', bgcolor: '#f6f8fa' }}>
                                {line.newLine || ''}
                              </Box>
                              <Box sx={{ px: 1, flex: 1, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} {line.content}
                              </Box>
                            </Box>

                            {lineComments.length > 0 && (
                              <Box sx={{ borderTop: '1px solid #d0d7de', borderBottom: '1px solid #d0d7de' }}>
                                {renderComments(lineComments)}
                              </Box>
                            )}
                          </Box>
                        );
                      });

                      const unmatchedComments = comments.filter(c => 
                        c.path === selectedFile && 
                        !renderedCommentIds.has(`${c.path}-${c.line}-${c.body.substring(0, 30)}`)
                      );

                      return (
                        <>
                          {diffContent}
                          {unmatchedComments.length > 0 && (
                            <Box sx={{ mt: 2, p: 2, borderTop: '2px dashed #d0d7de', bgcolor: '#fffbed' }}>
                              <Typography variant="subtitle2" sx={{ mb: 2, color: '#856404', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WarningIcon sx={{ fontSize: 18 }} />
                                Comments on other lines (not visible in this diff)
                              </Typography>
                              {renderComments(unmatchedComments)}
                            </Box>
                          )}
                        </>
                      );
                    })()}
                 </Box>
               </Paper>
             ) : (
               renderComments(comments.filter(c => !selectedFile || c.path === selectedFile))
             )}
           </Box>
        </Box>
      </Paper>
    </Box>
  );
}
