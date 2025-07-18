# Use Node.js 18 with Alpine Linux for smaller image size
FROM node:18-alpine

# Install FFmpeg and other required dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create directories for media processing
RUN mkdir -p temp output

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S videorender -u 1001 -G nodejs

# Change ownership of working directory
RUN chown -R videorender:nodejs /app

# Switch to non-root user
USER videorender

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV COMPRESSION_PRESET=youtube-1080p

# Expose port (if needed for health checks)
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "console.log('Health check OK')" || exit 1

# Default command
CMD ["npm", "start"] 