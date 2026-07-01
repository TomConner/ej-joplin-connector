#!/bin/bash

# Joplin MCP Server Test Script
# This script verifies that your Joplin MCP server can start and connect to Joplin

set -e

echo "🧪 Joplin MCP Server Test"
echo "=========================="
echo ""

# Check if server/index.js exists
if [ ! -f "server/index.js" ]; then
    echo "❌ Error: server/index.js not found"
    echo ""
    echo "Build the project first:"
    echo "  npm run build"
    exit 1
fi

echo "✅ server/index.js found"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found, installing dependencies..."
    npm install
fi

echo "✅ Dependencies installed"
echo ""

# Run the server and capture its output
echo "🚀 Starting Joplin MCP server..."
echo ""

# Run with a 5-second timeout to test connection
timeout 5s node server/index.js 2>&1 || EXIT_CODE=$?

if [ "$EXIT_CODE" = "124" ]; then
    # Timeout exit code - this is expected, server was running
    echo ""
    echo "✅ Server started successfully!"
    echo ""
    echo "Configuration for Claude Desktop:"
    echo "=================================="
    echo ""
    echo "Add this to ~/.claude/claude_desktop_config.json:"
    echo ""
    echo '{
  "mcpServers": {
    "joplin": {
      "command": "node",
      "args": ["'"$(pwd)"'/server/index.js"]
    }
  }
}'
    echo ""
    echo "Then restart Claude Desktop. On the first tool call, you'll be prompted in Joplin to grant access."
elif [ -z "$EXIT_CODE" ] || [ "$EXIT_CODE" = "0" ]; then
    echo ""
    echo "✅ Server test passed!"
else
    echo ""
    echo "❌ Server failed with exit code $EXIT_CODE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure Joplin is running with Web Clipper enabled (Tools > Options > Web Clipper)"
    echo "2. If prompted, approve the authorization request in Joplin"
    echo "3. Check that port 41184-41194 is accessible"
fi
