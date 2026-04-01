"""
simulation.py — FastAPI router for Monte Carlo simulation endpoints.

Endpoints in this module stream results back to the client using
Server-Sent Events (SSE), which lets the frontend update its charts
in real time without polling.

SSE format (per the WHATWG spec):
    data: <JSON string>\n\n

Each "data:" line is one progress snapshot from the simulation generator.
The stream ends with a final event where the JSON contains "complete": true.

"""

import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.simulation.standard_mc import SimulationConfig, run_standard_mc


# ── Router setup ──────────────────────────────────────────────────────────────

# All routes defined here are registered on the main FastAPI app in main.py.
# The prefix "/simulate" is applied at registration time so that this file
# stays focused on simulation logic, not URL structure.
router = APIRouter()


# ── SSE helpers ───────────────────────────────────────────────────────────────

def _format_sse(data: dict) -> str:
    """
    Serialise a dict as a single SSE data line.

    The WHATWG SSE spec requires each message to be prefixed with "data: "
    and terminated with a blank line (two newlines).  The browser's
    EventSource API — and our manual fetch-based reader — both expect
    exactly this format.

    Args:
        data (dict): The payload to send.  Must be JSON-serialisable.

    Returns:
        str: A correctly formatted SSE message string.
    """
    return f"data: {json.dumps(data)}\n\n"


def _stream_simulation(config: SimulationConfig):
    """
    Generator that wraps run_standard_mc and formats each chunk as SSE.

    Catches any exception raised by the simulation and sends a final
    error event so the client can surface a meaningful message rather
    than simply seeing the stream close unexpectedly.

    Args:
        config (SimulationConfig): Parameters forwarded to run_standard_mc.

    Yields:
        str: SSE-formatted strings, one per progress snapshot.
    """
    try:
        for chunk in run_standard_mc(config):
            yield _format_sse(chunk)
    except Exception as exc:
        # Send a structured error event before closing the stream.
        error_payload = {
            "error": True,
            "message": str(exc),
        }
        yield _format_sse(error_payload)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/standard-mc")
def standard_mc_endpoint(config: SimulationConfig) -> StreamingResponse:
    """
    Stream a Standard Monte Carlo simulation as Server-Sent Events.

    The client POSTs a SimulationConfig JSON body.  The response is an
    unbuffered SSE stream; each event contains a progress snapshot from
    the simulation engine.  The final event always includes "complete": true.

    Args:
        config (SimulationConfig): Simulation parameters parsed from the
                                   JSON request body by FastAPI/Pydantic.

    Returns:
        StreamingResponse: An SSE stream with media_type "text/event-stream".
                           Cache-Control and X-Accel-Buffering headers are set
                           to prevent proxies from buffering the stream.
    """
    headers = {
        # Prevent browsers and reverse proxies from caching SSE streams.
        "Cache-Control": "no-cache",
        # Tell nginx (if present) not to buffer the response.
        "X-Accel-Buffering": "no",
    }

    return StreamingResponse(
        _stream_simulation(config),
        media_type="text/event-stream",
        headers=headers,
    )
