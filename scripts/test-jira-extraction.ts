#!/usr/bin/env tsx
/**
 * Test Jira ticket ID extraction from various PR title formats
 */

import { extractJiraTicketFromTitle } from '../src/lib/constants/regex';

const testCases = [
  // Conventional commit format
  { title: 'feat(ABC-123): Add new feature', expected: 'ABC-123' },
  { title: 'fix(XYZ-456): Fix critical bug', expected: 'XYZ-456' },
  { title: 'chore(PROJ-789): Update dependencies', expected: 'PROJ-789' },

  // Square brackets
  { title: '[ABC-123] Add new feature', expected: 'ABC-123' },
  { title: '[JIRA-999] Fix bug in authentication', expected: 'JIRA-999' },

  // Start with colon
  { title: 'ABC-123: Implement user dashboard', expected: 'ABC-123' },
  { title: 'TICKET-001: Update API endpoints', expected: 'TICKET-001' },

  // In parentheses (at end or middle)
  { title: 'Add new feature (ABC-123)', expected: 'ABC-123' },
  { title: 'Fix bug (JIRA-456) in payment', expected: 'JIRA-456' },

  // Start with space
  { title: 'ABC-123 Add new authentication', expected: 'ABC-123' },

  // No Jira ticket
  { title: 'Add new feature without ticket', expected: null },
  { title: 'Fix: some bug', expected: null },
  { title: 'Update README', expected: null },

  // Edge cases
  { title: 'feat(abc-123): lowercase should not match', expected: null },
  { title: 'Multiple tickets without format', expected: null }, // No pattern match
  { title: 'Multiple [ABC-123] and [XYZ-456] tickets', expected: 'ABC-123' }, // Should match first
];

console.log('🧪 Testing Jira Ticket Extraction\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach(({ title, expected }, index) => {
  const result = extractJiraTicketFromTitle(title);
  const isMatch = result === expected;

  if (isMatch) {
    passed++;
    console.log(`✅ Test ${index + 1}: PASS`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: FAIL`);
    console.log(`   Title: "${title}"`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Got: ${result}`);
  }
});

console.log('='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✨ All tests passed!\n');
} else {
  console.log('⚠️  Some tests failed.\n');
  process.exit(1);
}
