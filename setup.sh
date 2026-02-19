#!/usr/bin/env bash
#
# xander-draw-mcp setup script for Ubuntu
# Usage: chmod +x setup.sh && ./setup.sh
#

set -euo pipefail

echo "╔════════════════════════════════════════════════════╗"
echo "║       xander-draw-mcp — Ubuntu Setup Script       ║"
echo "╚════════════════════════════════════════════════════╝"

# ── Check Node.js ──────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "[!] Node.js not found. Installing via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo "[✓] Node.js ${NODE_VERSION} found"

    # Check minimum version (18)
    MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
    if [ "$MAJOR" -lt 18 ]; then
        echo "[!] Node.js 18+ required. Current: ${NODE_VERSION}"
        echo "    Install newer version: https://nodejs.org/"
        exit 1
    fi
fi

# ── Check npm ──────────────────────────────────────────────────────────
if ! command -v npm &> /dev/null; then
    echo "[!] npm not found. It should come with Node.js."
    exit 1
fi
echo "[✓] npm $(npm --version) found"

# ── Install dependencies ──────────────────────────────────────────────
echo ""
echo "[*] Installing project dependencies..."
npm install

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║                 Setup Complete!                    ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║                                                    ║"
echo "║  Start development:                                ║"
echo "║    npm run dev                                     ║"
echo "║                                                    ║"
echo "║  This starts:                                      ║"
echo "║    • Excalidraw client on http://localhost:3000     ║"
echo "║    • MCP ingest server on http://localhost:3100     ║"
echo "║                                                    ║"
echo "║  Or use Docker:                                    ║"
echo "║    docker compose up --build                       ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
