# syntax=docker/dockerfile:1
ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
RUN bun install --frozen-lockfile

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN bun run build

FROM oven/bun:${BUN_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone output needs static assets and public files alongside server.js.
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public

USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD bun -e 'fetch("http://127.0.0.1:3000/favicon.ico").then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))'
CMD ["bun", "server.js"]
