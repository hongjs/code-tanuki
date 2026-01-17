/**
 * Utility functions for processing git diffs
 */

interface AnnotatedLine {
  lineNumber: number | null;
  content: string;
  type: 'context' | 'added' | 'removed' | 'hunk' | 'header';
}

/**
 * Parses a unified diff and annotates each line with its actual line number in the new file.
 * This helps AI models accurately reference line numbers when creating review comments.
 *
 * @param diff - The unified diff string from git
 * @returns Annotated diff string with line numbers prefixed
 */
export function annotateDiffWithLineNumbers(diff: string): string {
  const lines = diff.split('\n');
  const annotatedLines: string[] = [];

  let currentNewLine = 0;
  let inHunk = false;

  for (const line of lines) {
    // Check for hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);

    if (hunkMatch) {
      // Extract the new file starting line number
      currentNewLine = parseInt(hunkMatch[1], 10);
      inHunk = true;
      annotatedLines.push(`[HUNK] ${line}`);
      continue;
    }

    // File headers (diff --git, index, ---, +++)
    if (line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('---') ||
        line.startsWith('+++') ||
        line.startsWith('Binary files')) {
      annotatedLines.push(`[FILE] ${line}`);
      inHunk = false;
      continue;
    }

    if (!inHunk) {
      annotatedLines.push(line);
      continue;
    }

    // Process lines within a hunk
    if (line.startsWith('+')) {
      // Added line - has a line number in the new file
      annotatedLines.push(`[LINE ${currentNewLine}] ${line}`);
      currentNewLine++;
    } else if (line.startsWith('-')) {
      // Removed line - no line number in new file
      annotatedLines.push(`[REMOVED] ${line}`);
      // Don't increment currentNewLine for removed lines
    } else if (line.startsWith(' ') || line === '') {
      // Context line (unchanged) - has a line number in the new file
      // Empty lines within hunks are context too
      annotatedLines.push(`[LINE ${currentNewLine}] ${line}`);
      currentNewLine++;
    } else {
      // Other content (shouldn't happen often in well-formed diffs)
      annotatedLines.push(line);
    }
  }

  return annotatedLines.join('\n');
}

/**
 * Simplified version that only annotates added/modified lines
 * to reduce noise in the output
 */
export function annotateDiffAddedLinesOnly(diff: string): string {
  const lines = diff.split('\n');
  const annotatedLines: string[] = [];

  let currentNewLine = 0;
  let inHunk = false;

  for (const line of lines) {
    // Check for hunk header
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);

    if (hunkMatch) {
      currentNewLine = parseInt(hunkMatch[1], 10);
      inHunk = true;
      annotatedLines.push(line);
      continue;
    }

    // File headers
    if (line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('---') ||
        line.startsWith('+++') ||
        line.startsWith('Binary files')) {
      annotatedLines.push(line);
      inHunk = false;
      continue;
    }

    if (!inHunk) {
      annotatedLines.push(line);
      continue;
    }

    // Process lines within a hunk
    if (line.startsWith('+')) {
      // Added line - annotate with line number
      annotatedLines.push(`+[L${currentNewLine}] ${line.substring(1)}`);
      currentNewLine++;
    } else if (line.startsWith('-')) {
      // Removed line - keep as is
      annotatedLines.push(line);
    } else if (line.startsWith(' ') || line === '') {
      // Context line - keep as is but increment counter
      annotatedLines.push(line);
      currentNewLine++;
    } else {
      annotatedLines.push(line);
    }
  }

  return annotatedLines.join('\n');
}
