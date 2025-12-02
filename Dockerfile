# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (skip Chromium download for Puppeteer)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_DOWNLOAD=true

# Skip all postinstall scripts (including Puppeteer's install script)
RUN npm ci --ignore-scripts

# Stage 2: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Skip Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code and data
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Set Node environment to production
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set hostname to listen on all interfaces
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
