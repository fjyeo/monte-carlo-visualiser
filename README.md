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
│   ├── requirements.txt    # Python dependencies
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
└── venv/                   # Python virtual environment (git-ignored)
```

---

## Local Development Setup

### Prerequisites

- **Node.js** 18 or later
- **Python** 3.11 or later
- **Git**

---

### 1 — Clone the repository

```bash
git clone <repo-url>
cd monte-carlo-visualiser
```

---

### 2 — Backend setup

```bash
# Create and activate a virtual environment
python -m venv venv

# macOS / Linux:
source venv/bin/activate

# Windows (PowerShell):
venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r backend/requirements.txt

# Start the development server (auto-reloads on file changes)
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive API docs (Swagger UI) at `http://localhost:8000/docs`.

---

### 3 — Frontend setup

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

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

```bash
cd backend
pytest tests/
```
