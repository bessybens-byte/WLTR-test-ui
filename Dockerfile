ARG NODE_VERSION=20-slim
# ─────────────────────────────────────────────
#  Stage 1 — dependencies
#  Install ALL dependencies (including devDeps)
#  in a dedicated layer so the cache is only
#  busted when package*.json changes.
# ─────────────────────────────────────────────
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
# Only copy manifests first — maximises layer cache hits
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit

# ─────────────────────────────────────────────
#  Stage 2 — builder
#  Copy source on top of the cached deps layer
#  and produce the Next.js production build.
# ─────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Configure Node for faster builds
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* values are baked into static bundles at build time,
# so this ARG/ENV is only needed here — NOT in the runner stage.
ARG WLTR_API_ORIGIN
ARG NEXT_PUBLIC_WLTR_DIRECT_API
ARG NEXT_PUBLIC_WLTR_API_BASE_URL
ENV WLTR_API_ORIGIN=$WLTR_API_ORIGIN
ENV NEXT_PUBLIC_WLTR_DIRECT_API=$NEXT_PUBLIC_WLTR_DIRECT_API
ENV NEXT_PUBLIC_WLTR_API_BASE_URL=$NEXT_PUBLIC_WLTR_API_BASE_URL

# Bring in pre-installed node_modules from the dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source (cache miss only when source actually changes)
COPY . .

# Build Next.js with SWC (faster than Babel) - this is default in newer Next.js
# Add --no-lint if linting is slowing you down and you lint separately
RUN npm run build

# Remove dev dependencies (keep only production ones)
RUN npm prune --production --legacy-peer-deps

# ─────────────────────────────────────────────
#  Stage 3 — runner
#  Runtime image with production build output and production dependencies.
# ─────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Avoid running as root — create a non-privileged user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# .next/  — built Next.js app
# public/ — static assets
# node_modules/ — production dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]