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
import image_validator
import manager
import registry

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
    image_id: str = None
    image_ids: list[str] = None
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
    """
    Route a query to the right specialist. Supports single and multi-image.
    """
    # 1. Collect image paths
    image_paths = []
    images_meta = []

    if request.image_ids:
        for img_id in request.image_ids:
            img = IMAGE_STORE.get(img_id)
            if img is None:
                raise HTTPException(status_code=404, detail=f"Unknown image_id: {img_id}")
            image_paths.append(img["path"])
            images_meta.append(img)
    elif request.image_id:
        img = IMAGE_STORE.get(request.image_id)
        if img is None:
            raise HTTPException(status_code=404, detail="Unknown image_id.")
        image_paths.append(img["path"])
        images_meta.append(img)
    else:
        raise HTTPException(status_code=400, detail="No image_id or image_ids provided.")

    if not (request.query or "").strip():
        raise HTTPException(status_code=400, detail="Query is empty.")

    # 2. Manager decides the task
    routing = manager.route(request.query)
    task = routing["task"]

    # 3. Registry finds the specialist
    specialist = registry.get_specialist(task)
    if specialist is None:
        return {
            "status": "no_specialist",
            "task": task,
            "query": request.query,
            "routing_reason": routing["routing_reason"],
            "message": f"No specialist is connected for task '{task}' yet.",
            "execution_trace": _build_trace(images_meta[0], routing, specialist_ran=False),
        }

    # 4. Run the specialist (multi-image or single-image)
    if registry.is_multi_image_task(task):
        result = specialist(image_paths, request.query)
    else:
        result = specialist(image_paths[0], request.query)

    return {
        "status": "completed",
        "query": request.query,
        "task": result.get("task", task),
        "specialist": result.get("specialist"),
        "model": result.get("model"),
        "model_connected": result.get("model_connected", False),
        "answer": result.get("answer"),
        "message": result.get("message"),
        "confidence": result.get("confidence"),
        "evidence": result.get("evidence"),
        "routing_reason": routing["routing_reason"],
        "image_count": len(image_paths),
        "execution_trace": _build_trace(
            images_meta[0], routing,
            specialist_ran=True, result=result,
            image_count=len(image_paths)
        ),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _build_trace(image: dict, routing: dict, specialist_ran: bool,
                 result: dict | None = None, image_count: int = 1) -> list:
    trace = [
        {"step": "Images received", "detail": f"{image_count} image(s) uploaded"},
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