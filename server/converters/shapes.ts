/**
 * Simple Shapes → Excalidraw Elements Converter
 *
 * Converts a simplified shape descriptor format into proper Excalidraw elements.
 *
 * Supported shape types:
 *   - rectangle, ellipse, diamond, text, arrow, line, freedraw
 *
 * Example input:
 *   [
 *     { "type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 100, "label": "Service A", "id": "svc-a" },
 *     { "type": "ellipse", "x": 400, "y": 100, "width": 150, "height": 150, "label": "DB" },
 *     { "type": "arrow", "x": 300, "y": 150, "width": 100, "height": 0, "startBinding": "svc-a", "endBinding": "db" },
 *     { "type": "text", "x": 100, "y": 250, "text": "Architecture Diagram" }
 *   ]
 */

import { v4 as uuidv4 } from "uuid";

export interface ShapeDescriptor {
  type:
    | "rectangle"
    | "ellipse"
    | "diamond"
    | "text"
    | "arrow"
    | "line"
    | "freedraw";
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  label?: string;
  text?: string;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: "hachure" | "cross-hatch" | "solid";
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  // Arrow/line specific
  startBinding?: string;
  endBinding?: string;
  points?: [number, number][];
  // Grouping
  groupId?: string;
}

function baseElement(shape: ShapeDescriptor) {
  return {
    id: shape.id || uuidv4(),
    x: shape.x ?? 0,
    y: shape.y ?? 0,
    width: shape.width ?? 100,
    height: shape.height ?? 100,
    angle: 0,
    strokeColor: shape.strokeColor || "#1e1e1e",
    backgroundColor: shape.backgroundColor || "transparent",
    fillStyle: shape.fillStyle || "hachure",
    strokeWidth: shape.strokeWidth ?? 2,
    strokeStyle: "solid" as const,
    roughness: shape.roughness ?? 1,
    opacity: shape.opacity ?? 100,
    seed: Math.floor(Math.random() * 2000000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2000000000),
    isDeleted: false,
    boundElements: null as any,
    updated: Date.now(),
    link: null,
    locked: false,
    groupIds: shape.groupId ? [shape.groupId] : [],
    frameId: null,
    roundness: { type: 3 },
  };
}

function createRectangle(shape: ShapeDescriptor) {
  const el: any = {
    ...baseElement(shape),
    type: "rectangle",
  };

  // If the shape has a label, create a bound text element
  const results = [el];
  if (shape.label) {
    const textEl = createBoundText(el, shape.label, shape);
    el.boundElements = [{ id: textEl.id, type: "text" }];
    results.push(textEl);
  }
  return results;
}

function createEllipse(shape: ShapeDescriptor) {
  const el: any = {
    ...baseElement(shape),
    type: "ellipse",
  };

  const results = [el];
  if (shape.label) {
    const textEl = createBoundText(el, shape.label, shape);
    el.boundElements = [{ id: textEl.id, type: "text" }];
    results.push(textEl);
  }
  return results;
}

function createDiamond(shape: ShapeDescriptor) {
  const el: any = {
    ...baseElement(shape),
    type: "diamond",
  };

  const results = [el];
  if (shape.label) {
    const textEl = createBoundText(el, shape.label, shape);
    el.boundElements = [{ id: textEl.id, type: "text" }];
    results.push(textEl);
  }
  return results;
}

function createText(shape: ShapeDescriptor) {
  return [
    {
      ...baseElement(shape),
      type: "text",
      text: shape.text || shape.label || "",
      fontSize: shape.fontSize ?? 20,
      fontFamily: shape.fontFamily ?? 5, // Excalifont
      textAlign: shape.textAlign || "left",
      verticalAlign: "top",
      containerId: null,
      originalText: shape.text || shape.label || "",
      autoResize: true,
      lineHeight: 1.25,
    },
  ];
}

function createArrow(shape: ShapeDescriptor) {
  const el: any = {
    ...baseElement(shape),
    type: "arrow",
    points: shape.points || [
      [0, 0],
      [shape.width ?? 100, shape.height ?? 0],
    ],
    lastCommittedPoint: null,
    startBinding: shape.startBinding
      ? { elementId: shape.startBinding, focus: 0, gap: 5, fixedPoint: null }
      : null,
    endBinding: shape.endBinding
      ? { elementId: shape.endBinding, focus: 0, gap: 5, fixedPoint: null }
      : null,
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
  };

  const results: any[] = [el];
  if (shape.label) {
    const textEl = createBoundText(el, shape.label, shape);
    el.boundElements = [{ id: textEl.id, type: "text" }];
    results.push(textEl);
  }
  return results;
}

function createLine(shape: ShapeDescriptor) {
  return [
    {
      ...baseElement(shape),
      type: "line",
      points: shape.points || [
        [0, 0],
        [shape.width ?? 100, shape.height ?? 0],
      ],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: null,
    },
  ];
}

function createBoundText(
  container: any,
  text: string,
  shape: ShapeDescriptor
) {
  return {
    id: uuidv4(),
    type: "text",
    x: container.x + 10,
    y: container.y + container.height / 2 - 10,
    width: container.width - 20,
    height: 20,
    angle: 0,
    strokeColor: shape.strokeColor || "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    seed: Math.floor(Math.random() * 2000000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2000000000),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    groupIds: shape.groupId ? [shape.groupId] : [],
    frameId: null,
    roundness: null,
    text,
    fontSize: shape.fontSize ?? 16,
    fontFamily: shape.fontFamily ?? 5,
    textAlign: "center" as const,
    verticalAlign: "middle" as const,
    containerId: container.id,
    originalText: text,
    autoResize: true,
    lineHeight: 1.25,
  };
}

export function convertShapesToElements(
  shapes: ShapeDescriptor[]
): any[] {
  const allElements: any[] = [];

  for (const shape of shapes) {
    switch (shape.type) {
      case "rectangle":
        allElements.push(...createRectangle(shape));
        break;
      case "ellipse":
        allElements.push(...createEllipse(shape));
        break;
      case "diamond":
        allElements.push(...createDiamond(shape));
        break;
      case "text":
        allElements.push(...createText(shape));
        break;
      case "arrow":
        allElements.push(...createArrow(shape));
        break;
      case "line":
        allElements.push(...createLine(shape));
        break;
      default:
        console.warn(
          `[Shapes Converter] Unknown shape type: ${(shape as any).type}`
        );
    }
  }

  return allElements;
}
