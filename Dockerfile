# ── Build stage ────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build
RUN npm run build:server

# ── Production stage ──────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Copy built client
COPY --from=build /app/dist ./dist

# Copy server code
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Expose ports
#   3000 = Vite preview / static files
#   3100 = MCP ingest API + WebSocket
EXPOSE 3000 3100

# Simple start script that runs both
CMD ["node", "dist-server/index.js"]
