#!/bin/bash
# ============================================================
# xander-draw-mcp — Machine 3 Setup
# Deploys alongside llm-cluster's machine3/server.js on Ubuntu
# Ports: 3200 (Ingest API), 3300 (Excalidraw UI)
# ============================================================
# Usage: sudo bash setup-xander-draw.sh

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║   xander-draw-mcp — Machine 3 Setup (Ubuntu)      ║"
echo "╚════════════════════════════════════════════════════╝"

ACTUAL_USER=$(logname 2>/dev/null || echo ${SUDO_USER:-$USER})
PROJECT_DIR="/opt/xander-draw-mcp"
REPO_URL="https://github.com/Xander007x/xander-draw-mcp.git"

# ── Check Node.js ──────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "[!] Node.js not found. Install it first (see llm-cluster setup)."
    exit 1
fi
NODE_VERSION=$(node --version)
echo "[✓] Node.js ${NODE_VERSION} found"

# ── Clone/update repo ─────────────────────────────────────
echo ""
if [ -d "$PROJECT_DIR/.git" ]; then
    echo "[*] Updating existing installation..."
    cd "$PROJECT_DIR" && sudo -u "$ACTUAL_USER" git pull
    echo "[✓] Updated."
else
    echo "[*] Cloning xander-draw-mcp from GitHub..."
    sudo -u "$ACTUAL_USER" git clone "$REPO_URL" "$PROJECT_DIR"
    echo "[✓] Cloned to $PROJECT_DIR"
fi

# ── Install dependencies ──────────────────────────────────
echo ""
echo "[*] Installing dependencies..."
cd "$PROJECT_DIR"
sudo -u "$ACTUAL_USER" npm install
echo "[✓] Dependencies installed."

# ── Firewall rules ────────────────────────────────────────
echo ""
if command -v ufw &> /dev/null; then
    ufw allow 3200/tcp comment "xander-draw-mcp API" 2>/dev/null || true
    ufw allow 3300/tcp comment "xander-draw-mcp UI"  2>/dev/null || true
    echo "[✓] UFW rules added for ports 3200 and 3300"
else
    echo "[!] UFW not found. Manually open ports 3200 and 3300."
fi

# ── Create systemd service ────────────────────────────────
echo ""
echo "[*] Creating systemd service..."

cat > /etc/systemd/system/xander-draw-mcp.service << EOF
[Unit]
Description=Xander Draw MCP — Excalidraw Ingest Server & Canvas
After=network.target llm-mcp-server.service
Wants=llm-mcp-server.service

[Service]
Type=simple
ExecStart=$(which npm) run dev
WorkingDirectory=$PROJECT_DIR
Environment="INGEST_PORT=3200"
Environment="NODE_ENV=production"
Restart=on-failure
RestartSec=5
User=$ACTUAL_USER

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xander-draw-mcp
echo "[✓] Systemd service created and enabled."

# ── Done ──────────────────────────────────────────────────
echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║              Setup Complete!                       ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║                                                    ║"
echo "║  Start the service:                                ║"
echo "║    sudo systemctl start xander-draw-mcp            ║"
echo "║                                                    ║"
echo "║  Or run manually:                                  ║"
echo "║    cd $PROJECT_DIR && npm run dev                   ║"
echo "║                                                    ║"
echo "║  Excalidraw UI:  http://$(hostname -I | awk '{print $1}'):3300  ║"
echo "║  Ingest API:     http://$(hostname -I | awk '{print $1}'):3200  ║"
echo "║                                                    ║"
echo "║  The orchestrator on Machine 1 can now use:        ║"
echo "║    • draw       — Send shapes/Mermaid to canvas    ║"
echo "║    • visualize  — Natural language → diagram       ║"
echo "║    • draw_clear — Clear the canvas                 ║"
echo "║    • draw_export— Export scene as JSON              ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
