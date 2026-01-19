# Build stage - only install native DuckDB module
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Install build dependencies for DuckDB native module
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create minimal package.json for DuckDB native module only
# (other deps are bundled by esbuild in the pre-built dist/index.js)
RUN echo '{"name":"icelight-duckdb-container","type":"module","dependencies":{"@duckdb/node-api":"^1.4.3-r.3"}}' > package.json

# Install only DuckDB (native module)
RUN pnpm install

# Production stage
FROM node:20-bookworm-slim
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

# Install ca-certificates for HTTPS requests
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy DuckDB native module from builder
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules

# Copy pre-built bundled code (built locally with esbuild, bundles hono + sql-guard)
COPY --chown=hono:nodejs dist/index.js ./dist/index.js

# Copy pre-built DuckDB extensions
COPY --chown=hono:nodejs extensions/ ./extensions/

# Switch to non-root user
USER hono

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/_health').then(r => process.exit(r.ok ? 0 : 1))"

# Start the server
CMD ["node", "dist/index.js"]
