/**
 * xander-draw-mcp — MCP Ingest Server
 *
 * Accepts diagram instructions from external MCP orchestration servers
 * and pushes them to connected Excalidraw clients via WebSocket.
 *
 * Supported input formats:
 *   1. Simple shapes JSON — array of shape descriptors
 *   2. Mermaid syntax — flowchart/sequence/etc. strings
 *
 * Endpoints:
 *   POST /api/draw          — Draw elements on the canvas
 *   POST /api/draw/mermaid  — Parse Mermaid syntax and draw
 *   POST /api/clear         — Clear the canvas
 *   POST /api/scene         — Replace entire scene
 *   GET  /api/scene         — Export current scene as JSON
 *   GET  /api/health        — Health check
 *   WS   /ws                — WebSocket for real-time canvas sync
 */

import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { convertShapesToElements } from "./converters/shapes";
import { convertMermaidToElements } from "./converters/mermaid";

const PORT = parseInt(process.env.INGEST_PORT || "3200", 10);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const httpServer = http.createServer(app);

// ── WebSocket Server ──────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

// Current scene state (server-side mirror)
let currentScene: {
  elements: any[];
  appState?: Record<string, any>;
} = { elements: [] };

const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  clients.add(ws);

  // Send current scene to new client
  ws.send(
    JSON.stringify({
      type: "scene:init",
      payload: currentScene,
    })
  );

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Client can push scene updates back (e.g., user drew something manually)
      if (msg.type === "scene:update") {
        currentScene = msg.payload;
        // Broadcast to other clients
        broadcast({ type: "scene:update", payload: currentScene }, ws);
      }
    } catch (err) {
      console.error("[WS] Invalid message:", err);
    }
  });

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
    clients.delete(ws);
  });
});

function broadcast(msg: any, exclude?: WebSocket) {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// ── REST Endpoints ────────────────────────────────────────────────────

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    clients: clients.size,
    elements: currentScene.elements.length,
    timestamp: new Date().toISOString(),
  });
});

// Draw shapes (Simple JSON format)
app.post("/api/draw", (req, res) => {
  try {
    const { elements: shapeDescriptors, append = true } = req.body;

    if (!Array.isArray(shapeDescriptors)) {
      return res
        .status(400)
        .json({ error: "elements must be an array of shape descriptors" });
    }

    const newElements = convertShapesToElements(shapeDescriptors);

    if (append) {
      currentScene.elements = [...currentScene.elements, ...newElements];
    } else {
      currentScene.elements = newElements;
    }

    broadcast({ type: "scene:update", payload: currentScene });

    res.json({
      success: true,
      elementsAdded: newElements.length,
      totalElements: currentScene.elements.length,
    });
  } catch (err: any) {
    console.error("[API] /api/draw error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Draw from Mermaid syntax
app.post("/api/draw/mermaid", async (req, res) => {
  try {
    const { definition, append = true } = req.body;

    if (typeof definition !== "string") {
      return res
        .status(400)
        .json({ error: "definition must be a Mermaid syntax string" });
    }

    const newElements = await convertMermaidToElements(definition);

    if (append) {
      currentScene.elements = [...currentScene.elements, ...newElements];
    } else {
      currentScene.elements = newElements;
    }

    broadcast({ type: "scene:update", payload: currentScene });

    res.json({
      success: true,
      elementsAdded: newElements.length,
      totalElements: currentScene.elements.length,
    });
  } catch (err: any) {
    console.error("[API] /api/draw/mermaid error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Clear the canvas
app.post("/api/clear", (_req, res) => {
  currentScene = { elements: [] };
  broadcast({ type: "scene:update", payload: currentScene });
  res.json({ success: true, message: "Canvas cleared" });
});

// Replace entire scene
app.post("/api/scene", (req, res) => {
  try {
    const { elements, appState } = req.body;
    currentScene = {
      elements: elements || [],
      appState: appState || {},
    };
    broadcast({ type: "scene:update", payload: currentScene });
    res.json({
      success: true,
      totalElements: currentScene.elements.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export current scene
app.get("/api/scene", (_req, res) => {
  res.json(currentScene);
});

// ── Auto-detect format endpoint ───────────────────────────────────────
// Accepts either format and auto-detects which converter to use
app.post("/api/auto", async (req, res) => {
  try {
    const { input, append = true } = req.body;

    let newElements: any[];

    if (typeof input === "string") {
      // Treat as Mermaid
      newElements = await convertMermaidToElements(input);
    } else if (Array.isArray(input)) {
      // Treat as shapes JSON
      newElements = convertShapesToElements(input);
    } else {
      return res.status(400).json({
        error:
          "input must be a Mermaid string or an array of shape descriptors",
      });
    }

    if (append) {
      currentScene.elements = [...currentScene.elements, ...newElements];
    } else {
      currentScene.elements = newElements;
    }

    broadcast({ type: "scene:update", payload: currentScene });

    res.json({
      success: true,
      format: typeof input === "string" ? "mermaid" : "shapes",
      elementsAdded: newElements.length,
      totalElements: currentScene.elements.length,
    });
  } catch (err: any) {
    console.error("[API] /api/auto error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           xander-draw-mcp — Ingest Server              ║
╠════════════════════════════════════════════════════════╣
║  REST API:    http://0.0.0.0:${PORT}/api               ║
║  WebSocket:   ws://0.0.0.0:${PORT}/ws                  ║
║  Health:      http://0.0.0.0:${PORT}/api/health        ║
║  Canvas UI:   http://0.0.0.0:3300                      ║
╚════════════════════════════════════════════════════════╝
  `);
});
