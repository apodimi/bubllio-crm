FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --extra postgres --no-install-project

COPY src ./src
COPY scripts/production-entrypoint.sh ./scripts/production-entrypoint.sh

RUN useradd --create-home --uid 10001 bubllio \
    && mkdir -p /app/src/staticfiles \
    && chown -R bubllio:bubllio /app

USER bubllio
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD [".venv/bin/python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/', timeout=3)"]

ENTRYPOINT ["/bin/sh", "scripts/production-entrypoint.sh"]
