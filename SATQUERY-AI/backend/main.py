"""
main.py  ---  SatQuery AI backend (FastAPI)
===========================================

This is the entry point of the backend. It exposes three endpoints and wires
together the pieces (validator -> manager -> registry -> specialist).

    GET  /health    -> quick "is the server up?" check
    POST /upload    -> receive an image, validate it, store it, return an id
    POST /analyze   -> receive { image_id, query }, route it, run the specialist

The orchestration order inside /analyze mirrors the architecture exactly:

    validate  ->  manager.route(query)  ->  registry.get_specialist(task)
              ->  specialist.analyze(image_path, query)  ->  JSON result

Run it with:
    uvicorn main:app --reload
(the dev server will listen on http://localhost:8000)
"""
from __future__ import annotations

import os
import uuid

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)

from dotenv import load_dotenv
load_dotenv()  # reads backend/.env so GEMINI_API_KEY is available

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import image_validator
import registry

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SatQuery AI",
    description="Interactive vision-language assistant for remote-sensing image analysis.",
    version="0.1.0",
)

# Allow the Vite dev server (and a couple of common local ports) to call us.
# Without this, the browser blocks the frontend -> backend requests. This is
# the single most common "why won't it connect?" issue, so we set it up now.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",  # vite preview (production build preview)
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Where uploaded images are stored on disk.
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory mapping of image_id -> stored file info.
# This resets when the server restarts, which is fine for development. If we
# ever need persistence, this dict is the only thing that changes.
IMAGE_STORE: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Request/response models (kept minimal and readable)
# ---------------------------------------------------------------------------
from typing import Optional

class AnalyzeRequest(BaseModel):
    image_id: Optional[str] = None
    image_ids: Optional[list[str]] = None
    query: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    """Simple readiness check used by the frontend's status indicator."""
    return {
        "status": "ok",
        "service": "SatQuery AI",
        "active_specialists": registry.available_tasks(),
    }


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """
    Receive one image, validate it, store it, and return its id + metadata.

    The frontend calls this first. It then sends the returned image_id (not
    the whole file again) to /analyze for each question the user asks.
    """
    raw = await file.read()

    check = image_validator.validate_upload(file.filename, raw)
    if not check["ok"]:
        # A validation problem is the client's fault -> 400 with a clear reason.
        raise HTTPException(status_code=400, detail=check["error"])

    # Store the file under a fresh id, preserving the original extension.
    image_id = uuid.uuid4().hex
    stored_name = f"{image_id}{check['extension']}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)
    with open(stored_path, "wb") as f:
        f.write(raw)

    IMAGE_STORE[image_id] = {
        "path": stored_path,
        "filename": file.filename,
        "format": check["format"],
        "width": check["width"],
        "height": check["height"],
        "size_bytes": check["size_bytes"],
    }

    return {
        "status": "received",
        "image_id": image_id,
        "filename": file.filename,
        "format": check["format"],
        "width": check["width"],
        "height": check["height"],
        "size_bytes": check["size_bytes"],
    }


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    # 1. Gather all requested images.
    images = []
    if request.image_id:
        img = IMAGE_STORE.get(request.image_id)
        if not img:
            raise HTTPException(status_code=404, detail=f"Unknown image_id {request.image_id}")
        images.append(img)
        
    if request.image_ids:
        for idx in request.image_ids:
            img = IMAGE_STORE.get(idx)
            if not img:
                raise HTTPException(status_code=404, detail=f"Unknown image_id {idx}")
            images.append(img)
            
    if not images:
        raise HTTPException(status_code=400, detail="No images provided.")

    if not (request.query or "").strip():
        raise HTTPException(status_code=400, detail="Query is empty.")

    # 2. Plan the execution via the planner.
    import planner
    is_multi = len(images) > 1
    
    tracing_prefix = [
        {"step": "Images received", "detail": f"{len(images)} images selected"}
    ]
    
    try:
        plan = planner.create_execution_plan(request.query, is_multi)
        tracing_prefix.append({"step": "Orchestrator Planned", "detail": f"{len(plan)} tasks detected"})
        
        # 3. Execute the plan via the executor.
        import executor
        image_paths = [img["path"] for img in images]
        
        # Execute branches and aggregate structured UI results.
        final_payload = executor.execute_plan(plan, image_paths, request.query)
        final_payload["execution_trace"] = tracing_prefix + final_payload["execution_trace"]
        return final_payload
        
    except Exception as e:
        # CONTROL PLANE ERROR! e.g., gemini rating limit preventing plan assembly
        tracing_prefix.append({"step": "Orchestrator Planning Failed", "detail": "Unable to assemble execution sequence."})
        
        # We must NOT use ORCHESTRATOR as a specialist string!
        # Render the direct string value of the error which is already sanitized by gemini_engine.py
        msg = str(e)
        if not msg or "Internal" in msg:
            msg = "The AI model is temporarily unavailable (Quota/Demand limit reached)."
            
        return {
            "status": "failed",
            "task": "MULTI-AGENT ANALYSIS",
            "query": request.query,
            "specialist": "",
            "model": "",
            "answer": f"Analysis could not be planned: {msg}",
            "execution_plan": [],
            "execution_trace": tracing_prefix,
            "model_connected": True
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _build_trace(image: dict, routing: dict, specialist_ran: bool, result: dict | None = None) -> list:
    """
    Build a simple, honest execution trace the frontend can display.

    Each step is a plain dict {step, detail}. This is real information about
    what the backend actually did -- not a fabricated AI process.
    """
    trace = [
        {"step": "Image received", "detail": image["filename"]},
        {
            "step": "Image validated",
            "detail": f"{image.get('format') or 'image'} "
                      f"{image.get('width')}x{image.get('height')}",
        },
        {"step": "Query routed", "detail": routing["routing_reason"]},
        {"step": "Task selected", "detail": routing["task"]},
    ]
    if specialist_ran and result is not None:
        trace.append({"step": "Specialist invoked", "detail": result.get("specialist", "")})
        trace.append({"step": "Model status", "detail": result.get("message", "")})
    return trace
