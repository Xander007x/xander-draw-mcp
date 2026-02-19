# xander-draw-mcp

Self-hosted Excalidraw with an MCP ingest server for orchestration-driven diagram rendering.

**Part of the [llm-cluster](https://github.com/Xander007x/llm-cluster) ecosystem.** Runs on Machine 3 (Ubuntu) alongside the MCP worker, providing a visual canvas that the orchestrator can drive programmatically.

Your MCP orchestration server sends shapes or Mermaid syntax → this service draws them on a live Excalidraw canvas.

## Architecture (integrated with llm-cluster)

```
Machine 1 (Orchestrator, RTX 5090)
  └── orchestrator/server.js (stdio → VS Code)
       ├── think, code, analyze, discuss, consensus...
       ├── draw         → POST shapes/Mermaid to Machine 3 :3200
       ├── visualize    → LLM generates Mermaid → draw
       ├── draw_clear   → Clear the canvas
       ├── draw_export  → Export scene JSON
       └── draw_status  → Health check

Machine 3 (Ubuntu, 192.168.1.35)
  ├── machine3/server.js    (port 3100) — LLM MCP worker (existing)
  └── xander-draw-mcp       
       ├── Ingest API        (port 3200) — REST + WebSocket
       └── Excalidraw UI     (port 3300) — Canvas in browser
```

## Quick Start

### On Ubuntu (Machine 3)

```bash
git clone https://github.com/Xander007x/xander-draw-mcp.git /opt/xander-draw-mcp
cd /opt/xander-draw-mcp
sudo bash setup/setup-xander-draw.sh
sudo systemctl start xander-draw-mcp
```

### With Docker

```bash
docker compose up --build
```

### Access

- **Excalidraw UI**: http://192.168.1.35:3300
- **MCP Ingest API**: http://192.168.1.35:3200/api
- **Health Check**: http://192.168.1.35:3200/api/health

### From VS Code (via orchestrator)

Once the orchestrator is updated, you can use these tools directly in Copilot Chat:

- **`draw`** — Send shapes or Mermaid to the canvas
- **`visualize`** — Describe a diagram in English, LLM generates Mermaid, canvas renders it
- **`draw_clear`** — Clear the canvas
- **`draw_export`** — Export the current scene as JSON
- **`draw_status`** — Check if xander-draw-mcp is running

## API Reference

All endpoints accept/return JSON. The ingest server runs on port 3200.

### `POST /api/draw` — Draw shapes

Send an array of shape descriptors. Shapes are added to the existing canvas (use `"append": false` to replace).

```bash
curl -X POST http://192.168.1.35:3200/api/draw \
  -H "Content-Type: application/json" \
  -d '{
    "elements": [
      {
        "type": "rectangle",
        "x": 100, "y": 100,
        "width": 200, "height": 100,
        "label": "Service A",
        "id": "svc-a",
        "backgroundColor": "#a5d8ff"
      },
      {
        "type": "rectangle",
        "x": 400, "y": 100,
        "width": 200, "height": 100,
        "label": "Service B",
        "id": "svc-b",
        "backgroundColor": "#b2f2bb"
      },
      {
        "type": "arrow",
        "x": 300, "y": 150,
        "width": 100, "height": 0,
        "startBinding": "svc-a",
        "endBinding": "svc-b",
        "label": "REST"
      }
    ]
  }'
```

#### Supported shape types

| Type        | Properties                                                                 |
|-------------|---------------------------------------------------------------------------|
| `rectangle` | `x`, `y`, `width`, `height`, `label`, `backgroundColor`, `strokeColor`    |
| `ellipse`   | Same as rectangle                                                         |
| `diamond`   | Same as rectangle                                                         |
| `text`      | `x`, `y`, `text`, `fontSize`, `fontFamily`                                |
| `arrow`     | `x`, `y`, `width`, `height`, `points`, `startBinding`, `endBinding`, `label` |
| `line`      | `x`, `y`, `width`, `height`, `points`                                     |

### `POST /api/draw/mermaid` — Draw from Mermaid syntax

```bash
curl -X POST http://192.168.1.35:3200/api/draw/mermaid \
  -H "Content-Type: application/json" \
  -d '{
    "definition": "graph TD\n  A[Load Balancer] --> B[App Server]\n  B --> C[Database]\n  B --> D[Cache]"
  }'
```

### `POST /api/auto` — Auto-detect format

Sends either a Mermaid string or shapes array, and the server auto-detects the format:

```bash
# Mermaid (string input)
curl -X POST http://192.168.1.35:3200/api/auto \
  -H "Content-Type: application/json" \
  -d '{ "input": "graph LR\n  A[Start] --> B[End]" }'

# Shapes (array input)
curl -X POST http://192.168.1.35:3200/api/auto \
  -H "Content-Type: application/json" \
  -d '{ "input": [{"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 100, "label": "Box"}] }'
```

### `POST /api/clear` — Clear the canvas

```bash
curl -X POST http://192.168.1.35:3200/api/clear
```

### `GET /api/scene` — Export current scene

```bash
curl http://192.168.1.35:3200/api/scene
```

### `POST /api/scene` — Replace entire scene

```bash
curl -X POST http://192.168.1.35:3200/api/scene \
  -H "Content-Type: application/json" \
  -d '{ "elements": [...] }'
```

### `GET /api/health` — Health check

```bash
curl http://192.168.1.35:3200/api/health
# {"status":"ok","clients":1,"elements":5,"timestamp":"..."}
```

## Calling from Your MCP Server

From your orchestration MCP server (any language), just issue HTTP POST requests:

### Python example

```python
import requests

XANDER_DRAW = "http://192.168.1.35:3200"

# Draw a simple architecture diagram
requests.post(f"{XANDER_DRAW}/api/draw", json={
    "elements": [
        {"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 100, "label": "Frontend", "backgroundColor": "#a5d8ff"},
        {"type": "rectangle", "x": 100, "y": 300, "width": 200, "height": 100, "label": "Backend", "backgroundColor": "#b2f2bb"},
        {"type": "arrow", "x": 200, "y": 200, "width": 0, "height": 100, "label": "API calls"},
    ]
})

# Or send a Mermaid diagram
requests.post(f"{XANDER_DRAW}/api/draw/mermaid", json={
    "definition": "graph TD\n  A[User] --> B[API Gateway]\n  B --> C[Auth Service]\n  B --> D[Data Service]"
})
```

### Node.js example

```javascript
const XANDER_DRAW = "http://192.168.1.35:3200";

await fetch(`${XANDER_DRAW}/api/auto`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: "graph TD\n  A[Step 1] --> B[Step 2]\n  B --> C[Step 3]"
  })
});
```

## Development

```bash
npm run dev          # Start both client + server (hot reload)
npm run dev:client   # Excalidraw UI only
npm run dev:server   # Ingest server only
npm run build        # Production build
```

## Project Structure

```
xander-draw-mcp/
├── index.html                # Vite entry point
├── src/
│   ├── main.tsx              # React root
│   ├── App.tsx               # Excalidraw wrapper + WS client
│   ├── components/
│   │   └── StatusBar.tsx     # MCP connection status indicator
│   └── hooks/
│       └── useWebSocket.ts   # Auto-reconnecting WS hook
├── server/
│   ├── index.ts              # Express + WebSocket ingest server
│   └── converters/
│       ├── shapes.ts         # Simple JSON → Excalidraw elements
│       └── mermaid.ts        # Mermaid → Excalidraw elements
├── setup.sh                  # Ubuntu setup script
├── Dockerfile                # Container build
├── docker-compose.yml        # One-command deploy
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## License

MIT
