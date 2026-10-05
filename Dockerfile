FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /code

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN useradd -m appuser && chown -R appuser /code
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/v1/health || exit 1

# Local dev overrides this (see docker-compose.yml); production runs gunicorn with several
# uvicorn workers per gunicorn.conf.py.
CMD ["gunicorn", "app.main:app", "-c", "gunicorn.conf.py"]
