"""Production WSGI/ASGI server config. Local dev uses `uvicorn --reload` directly instead
(see README); this file is only read when the container's CMD runs gunicorn."""
import multiprocessing
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
worker_class = "uvicorn.workers.UvicornWorker"

# WEB_CONCURRENCY lets the platform size this (e.g. by available CPU/memory); otherwise a
# small, safe default based on core count.
workers = int(os.environ.get("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))

timeout = int(os.environ.get("GUNICORN_TIMEOUT", "30"))
graceful_timeout = 30
keepalive = 5

# Restart workers periodically to bound the effect of any slow memory leak.
max_requests = 1000
max_requests_jitter = 100

accesslog = "-"
errorlog = "-"
# Default access log format omits query strings and bodies, so it never captures tokens,
# passwords, or other request content — only method, path, status, and timing.
access_log_format = '%(h)s "%(r)s" %(s)s %(L)s'
