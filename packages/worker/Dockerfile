FROM mcr.microsoft.com/mirror/docker/library/python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY packages/pipeline /app/packages/pipeline
COPY packages/api /app/packages/api
COPY packages/worker /app/packages/worker
RUN pip install --no-cache-dir /app/packages/pipeline /app/packages/api /app/packages/worker
CMD ["arq", "worker.main.WorkerSettings"]
