FROM python:3.11-slim
WORKDIR /app
ARG CACHEBUST=20260330
COPY packages/pipeline /app/packages/pipeline
COPY packages/api /app/packages/api
RUN pip install --no-cache-dir /app/packages/pipeline /app/packages/api
WORKDIR /app/packages/api
ENV PYTHONPATH=/app/packages/api
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
