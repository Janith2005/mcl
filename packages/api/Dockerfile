FROM mcr.microsoft.com/mirror/docker/library/python:3.11-slim
WORKDIR /app
ARG CACHEBUST=20260330b
COPY packages/pipeline /app/packages/pipeline
COPY packages/api /app/packages/api
RUN pip install --no-cache-dir /app/packages/pipeline /app/packages/api
WORKDIR /app/packages/api
ENV PYTHONPATH=/app/packages/api
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
