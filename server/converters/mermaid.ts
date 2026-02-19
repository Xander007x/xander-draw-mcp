/**
 * Mermaid → Excalidraw Elements Converter
 *
 * Parses Mermaid diagram syntax and converts to Excalidraw elements.
 * Uses @excalidraw/mermaid-to-excalidraw when available, with a
 * fallback manual parser for basic flowcharts.
 *
 * Example input:
 *   "graph TD\n  A[Service A] --> B[Service B]\n  B --> C[Database]"
 */

import { v4 as uuidv4 } from "uuid";
import { convertShapesToElements, ShapeDescriptor } from "./shapes";

/**
 * Try using the official @excalidraw/mermaid-to-excalidraw package.
 * Falls back to a basic manual parser if unavailable.
 */
export async function convertMermaidToElements(
  definition: string
): Promise<any[]> {
  try {
    // Try the official converter first
    const mermaidModule = await import("@excalidraw/mermaid-to-excalidraw");
    const { parseMermaidToExcalidraw } = mermaidModule;
    const result = await parseMermaidToExcalidraw(definition);

    if (result && result.elements) {
      return result.elements;
    }
  } catch (err) {
    console.warn(
      "[Mermaid] Official converter unavailable, using fallback parser"
    );
  }

  // Fallback: basic manual parser for simple flowcharts
  return parseBasicFlowchart(definition);
}

// ── Fallback Parser ───────────────────────────────────────────────────
// Handles basic "graph TD/LR" with nodes and edges

interface ParsedNode {
  id: string;
  label: string;
  shape: "rectangle" | "ellipse" | "diamond";
}

interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
}

function parseBasicFlowchart(definition: string): any[] {
  const lines = definition
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Determine direction
  const headerMatch = lines[0].match(/^(graph|flowchart)\s+(TD|TB|LR|RL|BT)/i);
  const direction = headerMatch ? headerMatch[2].toUpperCase() : "TD";
  const isHorizontal = direction === "LR" || direction === "RL";

  const nodes = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];

  // Parse lines (skip the header)
  for (let i = headerMatch ? 1 : 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and styling
    if (line.startsWith("%%") || line.startsWith("style") || line.startsWith("classDef")) {
      continue;
    }

    // Match edges: A --> B, A -->|label| B, A -- label --> B
    const edgeMatch = line.match(
      /(\w+)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\})?\s*(-+->|=+=>|-.->|-+->|--+)\s*(?:\|([^|]*)\|\s*)?(\w+)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\})?/
    );

    if (edgeMatch) {
      const fromId = edgeMatch[1];
      const fromLabelRect = edgeMatch[2];
      const fromLabelRound = edgeMatch[3];
      const fromLabelDiamond = edgeMatch[4];
      const edgeLabel = edgeMatch[6];
      const toId = edgeMatch[7];
      const toLabelRect = edgeMatch[8];
      const toLabelRound = edgeMatch[9];
      const toLabelDiamond = edgeMatch[10];

      // Register nodes
      if (!nodes.has(fromId)) {
        nodes.set(fromId, {
          id: fromId,
          label: fromLabelRect || fromLabelRound || fromLabelDiamond || fromId,
          shape: fromLabelDiamond
            ? "diamond"
            : fromLabelRound
            ? "ellipse"
            : "rectangle",
        });
      }

      if (!nodes.has(toId)) {
        nodes.set(toId, {
          id: toId,
          label: toLabelRect || toLabelRound || toLabelDiamond || toId,
          shape: toLabelDiamond
            ? "diamond"
            : toLabelRound
            ? "ellipse"
            : "rectangle",
        });
      }

      edges.push({ from: fromId, to: toId, label: edgeLabel });
      continue;
    }

    // Match standalone node definitions: A[Label] or A(Label) or A{Label}
    const nodeMatch = line.match(
      /^\s*(\w+)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\})\s*$/
    );
    if (nodeMatch) {
      const nodeId = nodeMatch[1];
      const rectLabel = nodeMatch[2];
      const roundLabel = nodeMatch[3];
      const diamondLabel = nodeMatch[4];

      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          label: rectLabel || roundLabel || diamondLabel || nodeId,
          shape: diamondLabel
            ? "diamond"
            : roundLabel
            ? "ellipse"
            : "rectangle",
        });
      }
    }
  }

  // Layout nodes in a grid
  const nodeList = Array.from(nodes.values());
  const spacing = { x: 250, y: 150 };
  const nodeWidth = 180;
  const nodeHeight = 80;

  // Simple topological layout
  const positions = new Map<string, { x: number; y: number }>();
  const levels = new Map<string, number>();

  // Calculate levels (distance from root)
  function getLevel(nodeId: string, visited = new Set<string>()): number {
    if (levels.has(nodeId)) return levels.get(nodeId)!;
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const parents = edges
      .filter((e) => e.to === nodeId)
      .map((e) => e.from);

    if (parents.length === 0) {
      levels.set(nodeId, 0);
      return 0;
    }

    const maxParentLevel = Math.max(
      ...parents.map((p) => getLevel(p, visited))
    );
    const level = maxParentLevel + 1;
    levels.set(nodeId, level);
    return level;
  }

  for (const node of nodeList) {
    getLevel(node.id);
  }

  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  for (const node of nodeList) {
    const lvl = levels.get(node.id) ?? 0;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    levelGroups.get(lvl)!.push(node.id);
  }

  // Position nodes
  const startX = 100;
  const startY = 100;

  for (const [level, nodeIds] of levelGroups) {
    for (let i = 0; i < nodeIds.length; i++) {
      if (isHorizontal) {
        positions.set(nodeIds[i], {
          x: startX + level * spacing.x,
          y: startY + i * spacing.y,
        });
      } else {
        positions.set(nodeIds[i], {
          x: startX + i * spacing.x,
          y: startY + level * spacing.y,
        });
      }
    }
  }

  // Convert to shape descriptors
  const shapeDescriptors: ShapeDescriptor[] = [];

  for (const node of nodeList) {
    const pos = positions.get(node.id)!;
    shapeDescriptors.push({
      type: node.shape,
      id: node.id,
      x: pos.x,
      y: pos.y,
      width: nodeWidth,
      height: nodeHeight,
      label: node.label,
      backgroundColor: "#a5d8ff",
      fillStyle: "solid",
    });
  }

  // Add arrows
  for (const edge of edges) {
    const fromPos = positions.get(edge.from)!;
    const toPos = positions.get(edge.to)!;

    if (fromPos && toPos) {
      const startX = fromPos.x + nodeWidth / 2;
      const startY = fromPos.y + nodeHeight;
      const endX = toPos.x + nodeWidth / 2;
      const endY = toPos.y;

      shapeDescriptors.push({
        type: "arrow",
        id: uuidv4(),
        x: isHorizontal ? fromPos.x + nodeWidth : startX,
        y: isHorizontal ? fromPos.y + nodeHeight / 2 : startY,
        width: isHorizontal
          ? toPos.x - fromPos.x - nodeWidth
          : endX - startX,
        height: isHorizontal ? toPos.y + nodeHeight / 2 - (fromPos.y + nodeHeight / 2) : endY - startY,
        label: edge.label,
        startBinding: edge.from,
        endBinding: edge.to,
      });
    }
  }

  return convertShapesToElements(shapeDescriptors);
}
