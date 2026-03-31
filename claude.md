python -m venv venv

# Mac/Linux:

source venv/bin/activate

# Windows:

venv\Scripts\activate

```

---

**Once all of that is done, paste this into Claude Code to kick off session one:**
```

I am building a Monte Carlo simulation visualiser as an
A-level Computer Science NEA project. This is a full-stack
web application with a React/TypeScript/Vite frontend and
a Python/FastAPI backend.

Project values:

- Simple, readable, well-commented code over clever solutions
- Every function should have a clear docstring or JSDoc comment
- Consistent naming conventions throughout
- No unnecessary dependencies

Please scaffold the complete project structure as follows:

ROOT: monte-carlo-visualiser/

FRONTEND (Vite + React + TypeScript):

- Location: /frontend
- Install: d3, @types/d3, tailwindcss,
  autoprefixer, postcss, axios
- Folder structure:
  src/components/
  src/visualisations/
  src/hooks/
  src/types/
  src/utils/

BACKEND (Python FastAPI):

- Location: /backend
- Create requirements.txt with: fastapi, uvicorn,
  numpy, sympy, scipy
- Folder structure:
  app/api/
  app/simulation/
  app/distributions/
  app/diagnostics/
  app/parser/
  tests/

DOCUMENTATION:

- README.md with: project description, tech stack,
  local development setup instructions for both
  frontend and backend
- docs/DEVLOG.md with a first entry for today's date
  describing project initialisation
- docs/screenshot_log.md with the table structure:
  | # | Filename | Section | Caption |

OTHER:

- .gitignore covering Node, Python, venv,
  Vite build outputs, .env files
- .vscode/extensions.json recommending the
  extensions list I have installed

Then create:

1. A FastAPI main.py with a single /health endpoint
   that returns {"status": "ok", "message":
   "Monte Carlo API is running"}
2. A React App.tsx that calls /health on load and
   displays either a green "API Connected" or red
   "API Disconnected" status indicator

All code must be thoroughly commented. After completing
each file, tell me what you have created so I know
what to screenshot.
