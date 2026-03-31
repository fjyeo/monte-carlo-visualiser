"""
main.py — Entry point for the Monte Carlo Visualiser FastAPI backend.

Run the development server with:
    uvicorn main:app --reload --port 8000

"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Application setup ────────────────────────────────────────────────────────

# Create the FastAPI application instance.
# title and version appear in the auto-generated /docs page.
app = FastAPI(
    title="Monte Carlo Visualiser API",
    version="0.1.0",
    description="Backend for the A-Level CS NEA Monte Carlo simulation visualiser.",
)

# ── CORS middleware ──────────────────────────────────────────────────────────
#
# During development the React dev server runs on http://localhost:5173 while
# FastAPI runs on http://localhost:8000.  Without CORS headers the browser
# blocks cross-origin requests.
#
# In production the frontend is served as static files from the same origin,
# so CORS is only a development concern.  We restrict allowed origins to
# localhost ports only.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server (default port)
        "http://localhost:4173",   # Vite preview server
    ],
    allow_credentials=True,
    allow_methods=["*"],   # Allow GET, POST, OPTIONS, etc.
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check() -> dict:
    """
    Health endpoint — confirms the API is reachable.

    The React frontend calls this on startup to display a connection status
    badge.  Returns a simple JSON object so the frontend can verify the
    server is running correctly.

    Returns:
        dict: {"status": "ok", "message": "..."} on success.
    """
    return {
        "status": "ok",
        "message": "Monte Carlo API is running",
    }
