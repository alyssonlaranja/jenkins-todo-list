FROM node:22-alpine AS base

# Install required dependencies and pnpm
RUN apk add --no-cache libc6-compat curl wget && \
    corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Setup for dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/mcp-builder/package.json ./packages/mcp-builder/
COPY packages/mcp-builder-deepagent/package.json ./packages/mcp-builder-deepagent/

# Necessário para o postinstall hook funcionar corretamente
COPY scripts/ ./scripts/

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Setup for builder
FROM base AS builder
WORKDIR /app

# Copiar node_modules completo do root (inclui typescript e todas dependências hoisted)
COPY --from=deps /app/node_modules ./node_modules

# Copiar package.json dos workspaces para pnpm reconhecer a estrutura
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copiar packages directories com seus package.json
COPY --from=deps /app/packages ./packages

# Copiar todo o código fonte
COPY . .

# Build workspace packages - usar pnpm para resolver corretamente os paths do workspace
# O pnpm hoista as dependências no root, então precisamos buildar a partir do root
RUN pnpm --filter @cockpit/mcp-builder run build || echo "mcp-builder build skipped"
RUN pnpm --filter @cockpit/mcp-builder-deepagent run build || echo "mcp-builder-deepagent build skipped"

# Disable telemetry in build
ENV NEXT_TELEMETRY_DISABLED=1

# ✅ CORREÇÃO: Aumentar heap size para evitar out of memory durante build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application
RUN pnpm run build

# Setup for production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Configure directories with correct permissions
RUN mkdir -p /app/.next/cache /app/public && \
    chown -R nextjs:nodejs /app

# Optimization: improve security by limiting permissions
RUN chmod -R 755 /app/public

USER nextjs

# Copy necessary files (use --chown to set ownership during copy)
# Copy public directory if it exists (Next.js standalone includes it)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Configuration for better optimization
ENV PORT=4200
ENV HOSTNAME="0.0.0.0"
EXPOSE 4200

# Performance and streaming/suspense settings for Node.js
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-http-header-size=81920 --max-old-space-size=4096"

CMD ["node", "server.js"]
