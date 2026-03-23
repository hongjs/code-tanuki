#!/bin/sh
set -e

# Start MCP SSE server in background
node /app/mcp-dist/server.js &

# Start Next.js standalone server as PID 1
exec node /app/server.js
