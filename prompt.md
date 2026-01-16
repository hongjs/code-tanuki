สร้าง web app "CodeOwl" - AI-powered PR review tool สำหรับ dev manager

**Tech Stack:**

- Next.js 16 latest (App Router)
- Tailwind CSS
- TypeScript
- Docker
- ไม่มี authentication

**Core Features:**

1. **PR Review Page (หน้าหลัก)**

   - Input: GitHub PR URL
   - Extract Jira ticket ID จาก PR title (pattern: `feat(BYD-1234):`)
     - ถ้าไม่มี ticket ID → ข้าม Jira integration
   - Input: Additional prompt (optional textarea)
   - Button: "Start Review"
   - Loading states:
     - Step 1: "Fetching GitHub PR..." (spinner)
     - Step 2: "Fetching Jira ticket..." (spinner, ถ้ามี ticket)
     - Step 3: "AI Reviewing..." (spinner + estimated time)
   - Progress bar แสดง % completion
   - Success notification: "Review posted to GitHub PR #123"
   - Error notification: แสดง error message พร้อม retry button
   - Link: "View Review History" → /reports

2. **Integration Flow:**

   - ดึงข้อมูล PR จาก GitHub API (files changed, diff, comments)
   - ดึงข้อมูล Jira ticket (description, attachments, images, related tickets) ถ้ามี ticket ID
   - ส่งข้อมูลทั้งหมดไปยัง Claude API:
     - Model: `claude-opus-4-20250514`
     - ให้เลือก model ได้ เป็น dropdown default Opus 4.5
     - Max tokens: 8192 (output) อ่านจาก .env
     - Temperature: 0.3 (consistent reviews) อ่าจาก .env
     - System prompt:
       You are an expert code reviewer. Review PR changes against requirements.

   Focus on:

   1. Business requirements compliance (from Jira ticket)
   2. Potential bugs and edge cases
   3. Technical specification adherence
   4. Code duplication
   5. Performance issues

   Format: Inline comments with file path, line number, severity (critical/warning/suggestion).
   Be constructive and specific.

   - User prompt:
     Jira Ticket: {ticket_data or "No ticket provided"}
     PR Changes: {pr_diff}
     Additional Context: {user_prompt}
   - Post inline review comments ไปที่ GitHub PR (ใช้ GitHub Review API)
   - Comment status update ใน Jira ticket: "✅ AI Review completed: [PR link]" (ถ้ามี ticket)
   - Save review result เป็น JSON:
     - `/data/reviews/{repo}-{pr_number}-{timestamp}.json` (แต่ละรีวิว)
     - `/data/reviews/all-reviews.json` (append เป็น array)
   - Error handling:
     - Retry logic: 3 attempts with exponential backoff
     - Timeout: 300s
     - Rate limiting: รอแล้วลองใหม่
   - Duplicate prevention: เช็ค PR number + timestamp (ภายใน 5 นาที)

3. **Report Page:**

   - แสดง table/card list รีวิวทั้งหมดจาก `all-reviews.json`
   - Filter by: repository name (dropdown)
   - Search: PR number, ticket ID (search input)
   - แสดงข้อมูล:
     - Repository name
     - PR #
     - Ticket ID (or "N/A")
     - Timestamp
     - Status (success/failed)
     - Review summary (first 100 chars)
     - Action: "View Full Report" button → modal/detail page
   - Pagination: 20 items per page
   - Empty state: "No reviews yet. Start your first review!"

4. **JSON Schema:**

```json
{
  "id": "uuid",
  "timestamp": "ISO 8601",
  "repo": "owner/repo",
  "pr_number": 123,
  "pr_url": "https://...",
  "ticket_id": "BYD-1234 or null",
  "ticket_url": "https://... or null",
  "status": "success|failed",
  "error": "error message or null",
  "review_summary": "text",
  "comments_count": 5,
  "claude_model": "claude-opus-4-20250514",
  "tokens_used": { "input": 1000, "output": 500 }
}
```

5. **Docker Setup:**
   - Dockerfile:

```dockerfile
     FROM node:20-alpine
     WORKDIR /app
     COPY package*.json ./
     RUN npm ci
     COPY . .
     RUN npm run build
     EXPOSE 3000
     CMD ["npm", "start"]
```

- docker-compose.yml:

```yaml
services:
  codeowl:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
```

6. **Environment Variables (.env.example):**
   GITHUB_TOKEN=ghp_xxx
   JIRA_URL=https://yourcompany.atlassian.net
   JIRA_EMAIL=your-email@company.com
   JIRA_API_TOKEN=xxx
   ANTHROPIC_API_KEY=sk-ant-xxx
   NODE_ENV=production
   PORT=3000

**Structure:**
/app
/review - PR review page
/reports - Report viewing page
/api
/review - POST endpoint ประมวลผล
/reports - GET endpoint ดึง reports
/lib
/github - GitHub API helpers
/jira - Jira API helpers
/claude - Claude API integration (Opus 4.5)
/storage - JSON file operations
/components
/ui - Reusable components (loading, notifications, etc.)
/data (mapped volume)
/reviews - JSON files

**Local Development:**

- `npm install && npm run dev`
- ใช้ `.env.local` สำหรับ local
- Mock API responses ด้วย MSW (optional)

**Logging:**

- use winston
- Console.log level: info (production), debug (development)
- Log: API calls, errors, review results

**Data Retention:**

- เก็บไว้ทั้งหมด (ไม่ auto-delete)
- Manual cleanup ผ่าน script ถ้าต้องการ

สร้างให้ clean, maintainable, type-safe, พร้อม error handling และ UX feedback ครบถ้วน
