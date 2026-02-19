import { useCallback, useEffect, useRef, useState } from "react";
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
} from "@excalidraw/excalidraw/types";
import { useWebSocket } from "./hooks/useWebSocket";
import { StatusBar } from "./components/StatusBar";

export default function App() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const isRemoteUpdate = useRef(false);

  // Connect to the MCP ingest server via WebSocket
  const { status, lastMessage, sendMessage } = useWebSocket(
    `ws://${window.location.hostname}:3200/ws`
  );

  // Handle incoming scene updates from the ingest server
  useEffect(() => {
    if (!excalidrawAPI || !lastMessage) return;

    try {
      const msg = JSON.parse(lastMessage);

      if (msg.type === "scene:init" || msg.type === "scene:update") {
        isRemoteUpdate.current = true;

        // Preserve current viewport (scroll position + zoom) during remote updates
        // Without this, updateScene resets the view and elements "disappear" on scroll
        const appState = excalidrawAPI.getAppState();
        excalidrawAPI.updateScene({
          elements: msg.payload.elements || [],
          appState: {
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
            zoom: appState.zoom,
          },
        });

        // On initial load, auto-fit all elements into view
        if (msg.type === "scene:init" && (msg.payload.elements || []).length > 0) {
          setTimeout(() => {
            excalidrawAPI.scrollToContent(undefined, {
              fitToViewport: true,
              viewportZoomFactor: 0.9,
            });
          }, 50);
        }

        // Brief delay to avoid echo
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 100);
      }
    } catch (err) {
      console.error("[App] Failed to process WebSocket message:", err);
    }
  }, [excalidrawAPI, lastMessage]);

  // Send local changes back to the server
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (isRemoteUpdate.current) return;
      if (status !== "connected") return;

      // Debounced send — only send non-deleted elements
      const activeElements = elements.filter((el) => !el.isDeleted);
      sendMessage(
        JSON.stringify({
          type: "scene:update",
          payload: { elements: activeElements },
        })
      );
    },
    [status, sendMessage]
  );

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api as any)}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            loadScene: true,
            export: { saveFileToDisk: true },
            saveToActiveFile: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.Separator />
          <MainMenu.Item
            onSelect={() => {
              window.open("/api/health", "_blank");
            }}
          >
            🔌 MCP Server Status
          </MainMenu.Item>
          <MainMenu.Item
            onSelect={() => {
              fetch("/api/scene")
                .then((r) => r.json())
                .then((scene) => {
                  const blob = new Blob([JSON.stringify(scene, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "scene.excalidraw.json";
                  a.click();
                  URL.revokeObjectURL(url);
                });
            }}
          >
            📥 Export Scene (MCP)
          </MainMenu.Item>
        </MainMenu>

        <WelcomeScreen>
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Logo>
              <div style={{ fontSize: "2rem" }}>🎨</div>
            </WelcomeScreen.Center.Logo>
            <WelcomeScreen.Center.Heading>
              Xander Draw MCP
            </WelcomeScreen.Center.Heading>
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.HelpHint />
          </WelcomeScreen.Center>
        </WelcomeScreen>
      </Excalidraw>

      <StatusBar status={status} />
    </div>
  );
}
