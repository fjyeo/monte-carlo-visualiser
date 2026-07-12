# Monte Carlo Visualiser

An interactive web application for visualising and comparing Monte Carlo simulation methods, built as an A-Level Computer Science NEA project.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, D3.js, Axios |
| Backend  | Python, FastAPI, Uvicorn |
| Numerics | NumPy, SciPy, SymPy |

---

## Project Structure

```
monte-carlo-visualiser/
├── frontend/               # React + TypeScript SPA
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── visualisations/ # D3-powered chart components
│       ├── hooks/          # Custom React hooks
│       ├── types/          # Shared TypeScript interfaces
│       └── utils/          # Pure helper functions
│
├── backend/                # Python FastAPI application
│   ├── main.py             # ASGI entry point & route registration
│   └── app/
│       ├── api/            # Route handlers (one file per feature)
│       ├── simulation/     # Monte Carlo algorithm implementations
│       ├── distributions/  # Probability distribution helpers
│       ├── diagnostics/    # Convergence & statistical tests
│       └── parser/         # Safe maths expression parser
│
├── docs/
│   ├── DEVLOG.md           # Dated development diary
│   └── screenshot_log.md   # Screenshots table for NEA evidence
│
├── pyproject.toml          # Python project and dependency definitions
├── uv.lock                 # Reproducible Python dependency lockfile
└── .venv/                  # uv-managed environment (git-ignored)
```

---

## Local Development Setup

### Prerequisites

- **Node.js** 20.19 or later (Node 22 LTS is recommended)
- **Python** 3.11 or later
- **uv** for Python version and dependency management
- **Git**

On macOS, install Node.js and the `uv` Python package manager with Homebrew:

```bash
brew install node uv
```

If you use version managers, this repository includes:

- `.nvmrc` for Node (`nvm use`)
- `.python-version` for pyenv (`pyenv install && pyenv local`)

---

### 1 — Clone the repository

```bash
git clone <repo-url>
cd monte-carlo-visualiser
```

---

### 2 — Backend setup

Run these commands from the repository root (`monte-carlo-visualiser/`):

```bash
# Install the pinned Python version and all backend dependencies.
# uv creates the .venv environment automatically.
uv python install 3.11
uv sync

# Start the development server (auto-reloads on file changes)
uv run --directory backend uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive API docs (Swagger UI) at `http://localhost:8000/docs`.

---

### 3 — Frontend setup

Open a **second terminal at the repository root**. The `--prefix frontend`
option tells npm where to find the frontend's `package.json`:

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

If your terminal is already inside `frontend/`, use `npm ci` and
`npm run dev` without `--prefix`. Running plain `npm run dev` from the
repository root fails because there is intentionally no root `package.json`.

The React app will be available at `http://localhost:5173`.

The Vite dev server proxies `/api/*` requests to `http://localhost:8000`,
so you never need to configure CORS manually during development.

---

### 4 — Verify the setup

With both servers running, open `http://localhost:5173` in your browser.
You should see a green **"API Connected"** badge — this confirms the frontend
and backend are communicating correctly.

---

## Running Tests

Run all commands below from the repository root:

```bash
uv sync
uv run --directory backend pytest tests/
npm --prefix frontend run lint
npm --prefix frontend run build
```
