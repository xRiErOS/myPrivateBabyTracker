# =============================================================================
# MyBaby — Multi-Stage Docker Build
# =============================================================================

# Stage 1: Frontend Builder
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts
COPY frontend/ .
RUN npm run build

# Stage 2: Production Runtime
FROM python:3.12-slim AS production
WORKDIR /app

LABEL maintainer="Erik Riedel"
LABEL version="0.1.0"
LABEL description="Self-hosted, plugin-based baby tracker"

# System dependencies (curl for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy frontend build from Stage 1
COPY --from=frontend /app/frontend/dist ./static/

# Create data directory and non-root user
RUN mkdir -p /app/data && \
    groupadd -r mybaby && \
    useradd -r -g mybaby -d /app -s /sbin/nologin mybaby && \
    chown -R mybaby:mybaby /app

USER mybaby

EXPOSE 8000

STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD ["curl", "-f", "http://localhost:8000/api/v1/health"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--timeout-graceful-shutdown", "10", \
     "--forwarded-allow-ips", "192.168.178.0/24"]
