FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Production stage ---
FROM node:22-alpine

RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S fortress && \
    adduser -S fortress -u 1001 -G fortress

WORKDIR /app

# Copy built app from builder
COPY --from=builder --chown=fortress:fortress /app/.next ./.next
COPY --from=builder --chown=fortress:fortress /app/public ./public
COPY --from=builder --chown=fortress:fortress /app/package*.json ./
COPY --from=builder --chown=fortress:fortress /app/next.config.js ./
COPY --from=builder --chown=fortress:fortress /app/node_modules ./node_modules

# Switch to non-root user
USER fortress

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["/sbin/dumb-init", "--"]
CMD ["npm", "start"]
