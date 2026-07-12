# Development Log

A chronological diary of progress on the Monte Carlo Visualiser NEA project.

---

## 2026-07-12 — Reproducible Local Setup with uv

**Goal:** Make language and dependency installation reproducible and clarify
which directory each development command must run from.

**What was done:**

- Added `.nvmrc` and `.python-version` so macOS version managers select Node
  22 and Python 3.11 consistently.
- Raised and documented the frontend's Node.js engine requirement to 20.19 or
  later, matching Vite 8, while recommending Node 22 LTS.
- Adopted `uv` for Python 3.11 installation, virtual-environment management,
  dependency resolution, and command execution.
- Added root `pyproject.toml` and `uv.lock` files; `uv sync` now creates and
  populates `.venv` with both runtime and test dependencies.
- Retained the backend requirements files as compatibility exports while
  documenting `pyproject.toml` and `uv.lock` as the dependency source of truth.
- Added the backend health-endpoint test and its `pytest`/`httpx` development
  dependencies so the macOS setup can be verified automatically.
- Documented root-safe backend commands using `uv run --directory backend`.
- Documented root-safe frontend commands using `npm --prefix frontend`.
- Clarified that plain `npm run dev` only works after changing into
  `frontend/`, where the frontend `package.json` is located.
- Replaced the generated Vite frontend README with project-specific macOS,
  Node.js, install, run, lint, build, and preview instructions.
- Added macOS AppleDouble metadata patterns (`._*` and `.AppleDouble`) to
  `.gitignore` so Finder-generated files are not committed.

**Verified:** Backend tests, frontend linting, and the production frontend
build all pass.

---

## 2026-03-27 — Project Initialisation

**Goal:** Scaffold the complete project structure so both the frontend and backend can be run locally.

**What was done:**

- Created the root repository with a `LICENSE` and base `README.md`.
- Scaffolded the **frontend** using `npm create vite@latest` with the `react-ts` template.
  - Installed production dependencies: `d3`, `@types/d3`, `axios`.
  - Installed dev dependencies: `tailwindcss` (v4), `@tailwindcss/vite`, `autoprefixer`, `postcss`.
  - Configured Tailwind v4 via the Vite plugin (no `tailwind.config.js` required in v4).
  - Set up a Vite dev-server proxy so `/api/*` forwards to `http://localhost:8000`.
  - Created folder structure: `src/components/`, `src/visualisations/`, `src/hooks/`, `src/types/`, `src/utils/`.
- Scaffolded the **backend** using FastAPI.
  - Created `requirements.txt` with: `fastapi`, `uvicorn`, `numpy`, `sympy`, `scipy`.
  - Created `main.py` with a `/health` endpoint returning `{"status": "ok", "message": "..."}`.
  - Created package structure: `app/api/`, `app/simulation/`, `app/distributions/`, `app/diagnostics/`, `app/parser/`.
  - Added CORS middleware to allow requests from the Vite dev server (localhost:5173).
- Created documentation: `README.md`, `docs/DEVLOG.md`, `docs/screenshot_log.md`.
- Created `.gitignore` covering Node, Python, venv, Vite build outputs, and `.env` files.
- Created `.vscode/extensions.json` with recommended extensions.
- Wrote `App.tsx` — on load it calls `/api/health` and displays a green "API Connected" or red "API Disconnected" badge.

**Decisions made:**

- Using **Tailwind v4** (latest) — it no longer requires a `tailwind.config.js`; configuration is done in CSS with `@import "tailwindcss"`.
- The Vite proxy approach avoids CORS complexity in development; in production the frontend would be served from the same origin as the API.
- All `__init__.py` files added to backend packages so pytest can discover tests without extra configuration.

**Next steps at the time:**

- Install backend dependencies into the virtual environment (now handled by
  `uv sync`; see the 2026-07-12 entry).
- Implement the first simulation: basic Monte Carlo integration (estimating π).
- Design the D3 scatter-plot component for visualising sample points.
