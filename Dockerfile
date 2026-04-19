# Stage 1: Frontend build
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./static/

# Create data directory
RUN mkdir -p /data

EXPOSE 8080
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request,json; r=urllib.request.urlopen('http://localhost:8080/health'); d=json.load(r); assert d['db']"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", \
     "--timeout-graceful-shutdown", "10", \
     "--forwarded-allow-ips", "192.168.178.0/24"]
