# Pathway

Pathway is a local-first job assistant with a React web application and a
FastAPI backend. The backend persists data in PostgreSQL, parses resumes with
Docling, and can use a locally running Ollama model for AI-assisted features.

## Requirements

- Docker Desktop
- Node.js 20 or newer
- npm
- Optional: Ollama with a configured model for AI-assisted extraction and
  tailoring. The rest of the application runs without it.

Resume uploads use fast, evidence-linked deterministic extraction. The optional
“Extract again with AI” action uses the lightweight `qwen2.5:1.5b` Ollama model
by default and falls back safely when that model is not installed:

```bash
ollama pull qwen2.5:1.5b
```

Override only the dedicated resume model with
`RESUME_EXTRACTION_MODEL=<model-tag>`; the application will not silently choose
a larger installed model.

## Run locally

Start Docker Desktop, then run:

```bash
./start.sh
```

The launcher installs missing webapp dependencies, starts PostgreSQL and the
API, waits for backend health, applies database migrations, and starts Vite.
Open [http://localhost:5173](http://localhost:5173).

The API health endpoint is
[http://localhost:8000/health](http://localhost:8000/health).

Stop the Vite process with `Ctrl+C`. Stop the backend containers with:

```bash
./start.sh --down
```

## Validate

```bash
cd webapp
npm ci --include=dev
npm run build
npm run lint

cd ../backend
docker compose exec -T api python scripts/validate_config.py
docker compose exec -T api python scripts/validate_migrations.py
```

Backend configuration defaults are documented in
[`backend/.env.example`](backend/.env.example). Copy it to `backend/.env` only
when you need to override those defaults.

Historical product specifications and implementation plans are retained under
[`docs/`](docs/).
