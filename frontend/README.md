# Monte Carlo Visualiser Frontend

React, TypeScript, Vite, Tailwind CSS, D3, and Axios power the browser UI.

## macOS Setup

This project currently uses Vite 8, which requires Node 20.19 or later.
Node 22 LTS is recommended.

```bash
brew install node
cd monte-carlo-visualiser
npm --prefix frontend ci
npm --prefix frontend run dev
```

If you use nvm:

```bash
nvm use
npm --prefix frontend ci
npm --prefix frontend run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api/*` to the
FastAPI backend at `http://localhost:8000`.

## Commands

From the repository root:

```bash
npm --prefix frontend run dev      # Start Vite
npm --prefix frontend run build    # Type-check and build for production
npm --prefix frontend run lint     # Run ESLint
npm --prefix frontend run preview  # Preview the production build locally
```

Alternatively, `cd frontend` first and omit `--prefix frontend`. Plain
`npm run dev` cannot be run from the repository root because the root does
not contain a `package.json`.
