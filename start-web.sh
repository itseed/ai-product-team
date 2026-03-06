#!/bin/bash
# Start the AI Product Team web dashboard

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure workspace is ready
bash "$SCRIPT_DIR/shared/setup.sh" > /dev/null

echo ""
echo "  ╔════════════════════════════════════════╗"
echo "  ║   🤖  AI Product Team Dashboard        ║"
echo "  ║   http://localhost:3030                ║"
echo "  ╚════════════════════════════════════════╝"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

cd "$SCRIPT_DIR/web"
npm install --silent 2>/dev/null
node server.js
