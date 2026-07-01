#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INDEX_JS="$SCRIPT_DIR/server/index.js"
MCP_JSON="$SCRIPT_DIR/.mcp.json"
PORTS=(41184 41185 41186 41187 41188 41189 41190 41191 41192 41193 41194)
POLL_INTERVAL=2

# Find the port Joplin is listening on
find_port() {
  for port in "${PORTS[@]}"; do
    if curl -sf "http://localhost:$port/ping" > /dev/null 2>&1; then
      echo "$port"
      return 0
    fi
  done
  return 1
}

echo "Looking for Joplin Web Clipper service..."
if ! PORT=$(find_port); then
  echo "Error: Joplin is not running or Web Clipper is not enabled." >&2
  echo "Enable it at: Joplin > Tools > Options > Web Clipper" >&2
  exit 1
fi
echo "Found Joplin on port $PORT."

# Request an auth token
echo "Requesting authorization..."
AUTH_RESPONSE=$(curl -sf -X POST "http://localhost:$PORT/auth")
AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"auth_token":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "Error: Failed to get auth token from Joplin." >&2
  exit 1
fi

echo ""
echo ">>> Please open Joplin and approve the authorization request. <<<"
echo ""

# Poll until accepted or rejected
while true; do
  CHECK=$(curl -sf "http://localhost:$PORT/auth/check?auth_token=$AUTH_TOKEN")
  STATUS=$(echo "$CHECK" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

  case "$STATUS" in
    accepted)
      API_TOKEN=$(echo "$CHECK" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
      echo "Authorization accepted."
      break
      ;;
    rejected)
      echo "Error: Authorization was rejected in Joplin." >&2
      exit 1
      ;;
    waiting)
      sleep "$POLL_INTERVAL"
      ;;
    *)
      echo "Error: Unexpected response: $CHECK" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$API_TOKEN" ]]; then
  echo "Error: Accepted but no token returned." >&2
  exit 1
fi

# Write .mcp.json
cat > "$MCP_JSON" <<EOF
{
  "mcpServers": {
    "joplin": {
      "command": "node",
      "args": ["$INDEX_JS"],
      "env": {
        "JOPLIN_API_TOKEN": "$API_TOKEN"
      }
    }
  }
}
EOF

echo "Wrote $MCP_JSON"
