#!/bin/bash

# Joplin MCP Server Test Script
# This script verifies that your Joplin MCP server can start and connect to Joplin

set -e

echo "🧪 Joplin MCP Server Test"
echo "=========================="
echo ""

# Check if JOPLIN_API_TOKEN is set
if [ -z "$JOPLIN_API_TOKEN" ]; then
    echo "❌ Error: JOPLIN_API_TOKEN environment variable not set"
    echo ""
    echo "To set it, run:"
    echo "  export JOPLIN_API_TOKEN='your-token-here'"
    echo ""
    echo "Get your token from:"
    echo "  Joplin > Tools > Options > Web Clipper > Advanced"
    exit 1
fi

echo "✅ JOPLIN_API_TOKEN is set"
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
      "args": ["'"$(pwd)"'/server/index.js"],
      "env": {
        "JOPLIN_API_TOKEN": "your-token-here"
      }
    }
  }
}'
    echo ""
    echo "Then restart Claude Desktop."
elif [ -z "$EXIT_CODE" ] || [ "$EXIT_CODE" = "0" ]; then
    echo ""
    echo "✅ Server test passed!"
else
    echo ""
    echo "❌ Server failed with exit code $EXIT_CODE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure Joplin is running with Web Clipper enabled"
    echo "2. Verify your API token is correct"
    echo "3. Check that port 41184-41194 is accessible"
fi
