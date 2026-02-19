import React from "react";

interface StatusBarProps {
  status: "connecting" | "connected" | "disconnected";
}

const statusConfig = {
  connecting: { color: "#f59f00", label: "⏳ Connecting to MCP..." },
  connected: { color: "#40c057", label: "🟢 MCP Connected" },
  disconnected: { color: "#fa5252", label: "🔴 MCP Disconnected" },
};

export const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        backgroundColor: "rgba(30, 30, 30, 0.85)",
        color: config.color,
        padding: "4px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontFamily: "monospace",
        zIndex: 9999,
        pointerEvents: "none",
        backdropFilter: "blur(4px)",
        border: `1px solid ${config.color}33`,
      }}
    >
      {config.label}
    </div>
  );
};
