# IDE development workflow

The repository includes shared JetBrains run configurations under `.run/`.
They are committed so every contributor gets the same local commands instead of
having to recreate them manually.

## JetBrains IDEs

Open the repository root in PyCharm or IntelliJ IDEA with the Python plugin.
Select `Bubllio CRM — All` in the run configuration selector and press Play.
This starts:

- Django at `http://127.0.0.1:8000` using the repository `.venv`.
- Vite at `http://127.0.0.1:5173` with `/api` proxied to Django.

The backend reads the root `.env` file through the application settings. Copy
`.env.example` to `.env` and set `BUBLLIO_EMAIL_ENCRYPTION_KEY` if you need to
create or use SMTP accounts. Never commit `.env`.

If you want to run only one side, select `Bubllio CRM — Backend` or
`Bubllio CRM — Frontend`. The `All` configuration uses port `8000` for the
backend and port `5173` for Vite; stop any process already using those ports
before pressing Play.

## VS Code

The same commands can be run from two integrated terminals:

```bash
uv run python src/manage.py runserver 127.0.0.1:8000
cd frontend && API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev
```

The JetBrains configurations are the canonical shared Play-button workflow;
the terminal commands above are the portable fallback for other editors.
