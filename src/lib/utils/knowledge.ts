import fs from 'fs/promises';
import path from 'path';

const KNOWLEDGE_FILE = path.join(process.cwd(), 'data', 'knowledge.md');

const KNOWLEDGE_FOOTER = `\n\n---\n*This file is automatically updated by the self-learning system.*\n`;

export async function readKnowledge(): Promise<string> {
  try {
    const content = await fs.readFile(KNOWLEDGE_FILE, 'utf-8');
    return content;
  } catch {
    // File doesn't exist or can't be read — return empty string
    return '';
  }
}

export async function updateKnowledge(newSection: string): Promise<void> {
  let existing = '';
  try {
    existing = await fs.readFile(KNOWLEDGE_FILE, 'utf-8');
  } catch {
    // File doesn't exist yet — start fresh
  }

  // Ensure data directory exists
  await fs.mkdir(path.dirname(KNOWLEDGE_FILE), { recursive: true });

  // Remove the auto-generated footer if present, then append new section + footer
  const withoutFooter = existing.replace(/\n\n---\n\*This file is automatically updated.*$/s, '');
  const timestamp = new Date().toISOString();
  const sectionWithTimestamp = `\n\n<!-- Updated: ${timestamp} -->\n${newSection.trim()}`;

  const updated = (withoutFooter.trim() ? withoutFooter.trim() : '# Knowledge Base') +
    sectionWithTimestamp +
    KNOWLEDGE_FOOTER;

  await fs.writeFile(KNOWLEDGE_FILE, updated, 'utf-8');
}
