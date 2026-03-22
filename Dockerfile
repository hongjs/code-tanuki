# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build Next.js app with dummy env variables to bypass zod runtime validation
RUN GITHUB_TOKEN=dummy \
    JIRA_BASE_URL=https://dummy \
    JIRA_EMAIL=dummy@dummy.com \
    JIRA_API_TOKEN=dummy \
    ANTHROPIC_API_KEY=dummy \
    yarn build

# Bundle MCP server into a single JS file
RUN npx esbuild mcp/index.ts --bundle --platform=node --format=cjs --outfile=mcp-dist/server.js

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV MCP_PORT=3083
ENV CODE_TANUKI_BASE_URL=http://localhost:3000

# Create data and logs directories and ensure proper permissions
# Using .next/cache to prevent permission issues during standalone run
RUN mkdir -p /data/reviews /data/reviews-v2 /data/jira-tickets /logs .next/cache && \
    chown -R node:node /data /logs /app/.next

# Switch to non-root user
USER node

# Copy standalone output from builder
# Next.js standalone mode bundles dependencies automatically
# COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Copy MCP server bundle
COPY --from=builder --chown=node:node /app/mcp-dist ./mcp-dist

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

# Expose ports: 3000 = web, 3083 = MCP SSE
EXPOSE 3000 3083

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start both web and MCP servers via entrypoint
CMD ["/bin/sh", "/app/docker-entrypoint.sh"]
