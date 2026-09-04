"""
main.py  ---  SatQuery AI backend (FastAPI)
===========================================

This is the entry point of the backend. It exposes three endpoints and wires
together the pieces (validator -> manager -> registry -> specialist).

    GET  /health    -> quick "is the server up?" check
    POST /upload    -> receive an image, validate it, store it, return an id
    POST /analyze   -> receive { image_id, query }, route it, run the specialist

The orchestration order:

    SINGLE IMAGE:
        validate -> FAST KEYWORD MANAGER -> registry -> specialist

    MULTI IMAGE:
        validate -> Gemini Planner -> Executor -> specialist

Run it with:
    uvicorn main:app --reload
"""

from __future__ import annotations

import os
import uuid
import logging
from typing import Optional

import image_validator
import manager
import registry
import planner
import executor

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

load_dotenv()
# Reads backend/.env so GEMINI_API_KEY is available reliably.


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SatQuery AI",
    description=(
        "Interactive vision-language assistant for remote-sensing "
        "image analysis."
    ),
    version="0.1.0",
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Upload storage
# ---------------------------------------------------------------------------

UPLOAD_DIR = os.path.join(
    os.path.dirname(__file__),
    "uploads"
)

os.makedirs(UPLOAD_DIR, exist_ok=True)


# In-memory mapping:
# image_id -> stored file information
IMAGE_STORE: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    image_id: str = None
    image_ids: list[str] = None
    query: str


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """
    Simple readiness check used by the frontend's status indicator.
    """

    return {
        "status": "ok",
        "service": "SatQuery AI",
        "active_specialists": registry.available_tasks(),
    }


# ---------------------------------------------------------------------------
# POST /upload
# ---------------------------------------------------------------------------

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """
    Receive one image, validate it, store it, and return its id + metadata.

    The frontend calls this first. It then sends the returned image_id
    to /analyze for each question.
    """

    raw = await file.read()

    # Validate uploaded file
    check = image_validator.validate_upload(
        file.filename,
        raw
    )

    if not check["ok"]:
        raise HTTPException(
            status_code=400,
            detail=check["error"]
        )

    # Generate fresh image id
    image_id = uuid.uuid4().hex

    # Preserve original extension
    stored_name = f"{image_id}{check['extension']}"

    stored_path = os.path.join(
        UPLOAD_DIR,
        stored_name
    )

    # Save image
    with open(stored_path, "wb") as f:
        f.write(raw)

    # Store metadata
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


# ---------------------------------------------------------------------------
# POST /analyze
# ---------------------------------------------------------------------------

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    """
    Route a query to the appropriate specialist.

    SINGLE IMAGE:
        Uses the FAST keyword manager.
        No Gemini planner call.

    MULTI IMAGE:
        Uses the Gemini planner.
    """

    # =========================================================
    # 1. Collect image paths
    # =========================================================

    image_paths = []
    images_meta = []

    # Multiple images
    if request.image_ids:

        for img_id in request.image_ids:

            img = IMAGE_STORE.get(img_id)

            if img is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Unknown image_id: {img_id}"
                )

            image_paths.append(img["path"])
            images_meta.append(img)

    # Single image
    elif request.image_id:

        img = IMAGE_STORE.get(request.image_id)

        if img is None:
            raise HTTPException(
                status_code=404,
                detail="Unknown image_id."
            )

        image_paths.append(img["path"])
        images_meta.append(img)

    else:

        raise HTTPException(
            status_code=400,
            detail="No image_id or image_ids provided."
        )

    # =========================================================
    # 2. Validate query
    # =========================================================

    if not (request.query or "").strip():

        raise HTTPException(
            status_code=400,
            detail="Query is empty."
        )

    # =========================================================
    # 3. ROUTING
    # =========================================================

    is_multi_image = len(image_paths) > 1

    if not is_multi_image:

        logging.info(
            "FAST PATH: single-image keyword routing | query=%s",
            request.query
        )

        try:
            routing = manager.route(request.query)
            task = routing["task"]
            specialist_fn = registry.get_specialist(task)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Manager routing failed: {e}"
            )

        if specialist_fn is None:
            result = {
                "status": "no_specialist",
                "task": task,
                "query": request.query,
                "model_connected": False,
                "answer": f"No specialist for task '{task}' yet.",
                "execution_trace": [
                    {
                        "step": "Query routed",
                        "detail": routing["routing_reason"],
                    },
                ],
            }
        else:
            try:
                if registry.is_multi_image_task(task):
                    result_data = specialist_fn(image_paths, request.query)
                else:
                    result_data = specialist_fn(image_paths[0], request.query)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Specialist execution failed: {e}"
                )

            result = {
                "status": "completed",
                "query": request.query,
                "task": result_data.get("task", task),
                "specialist": result_data.get("specialist"),
                "model": result_data.get("model"),
                "model_connected": result_data.get("model_connected", False),
                "answer": result_data.get("answer"),
                "message": result_data.get("message"),
                "confidence": result_data.get("confidence"),
                "evidence": result_data.get("evidence"),
                "routing_reason": routing["routing_reason"],
                "execution_trace": [
                    {
                        "step": "Query routed",
                        "detail": routing["routing_reason"],
                    },
                    {
                        "step": "Task selected",
                        "detail": task,
                    },
                    {
                        "step": "Specialist invoked",
                        "detail": result_data.get("specialist", ""),
                    },
                ],
            }

    else:

        routing = manager.route(request.query)
        task = routing["task"]
        specialist_fn = registry.get_specialist(task)

        if specialist_fn is None:
            result = {
                "status": "no_specialist",
                "task": task,
                "query": request.query,
                "model_connected": False,
                "answer": f"No specialist for task '{task}' yet.",
                "execution_trace": [
                    {"step": "Query routed", "detail": routing["routing_reason"]},
                ],
            }
        else:
            try:
                if registry.is_multi_image_task(task):
                    result_data = specialist_fn(image_paths, request.query)
                else:
                    result_data = specialist_fn(image_paths[0], request.query)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Specialist execution failed: {e}"
                )

            result = {
                "status": "completed",
                "query": request.query,
                "task": result_data.get("task", task),
                "specialist": result_data.get("specialist"),
                "model": result_data.get("model"),
                "model_connected": result_data.get("model_connected", False),
                "answer": result_data.get("answer"),
                "message": result_data.get("message"),
                "confidence": result_data.get("confidence"),
                "evidence": result_data.get("evidence"),
                "routing_reason": routing["routing_reason"],
                "execution_trace": [
                    {"step": "Query routed", "detail": routing["routing_reason"]},
                    {"step": "Task selected", "detail": task},
                    {"step": "Specialist invoked", "detail": result_data.get("specialist", "")},
                ],
            }

    # =========================================================
    # 4. Add image metadata to execution trace
    # =========================================================

    prefix_trace = [

        {
            "step": "Images received",
            "detail": (
                f"{len(image_paths)} image(s) uploaded"
            ),
        },

        {
            "step": "Image validated",
            "detail": (
                f"{images_meta[0].get('format') or 'image'} "
                f"{images_meta[0].get('width')}x"
                f"{images_meta[0].get('height')}"
            ),
        },

    ]

    if "execution_trace" in result:

        result["execution_trace"] = (
            prefix_trace
            + result["execution_trace"]
        )

    else:

        result["execution_trace"] = prefix_trace

    # =========================================================
    # 5. Standardize response
    # =========================================================

    result["image_count"] = len(image_paths)

    return result


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _build_trace(
    image: dict,
    routing: dict,
    specialist_ran: bool,
    result: dict | None = None,
    image_count: int = 1,
) -> list:

    trace = [

        {
            "step": "Images received",
            "detail": (
                f"{image_count} image(s) uploaded"
            ),
        },

        {
            "step": "Image validated",
            "detail": (
                f"{image.get('format') or 'image'} "
                f"{image.get('width')}x"
                f"{image.get('height')}"
            ),
        },

        {
            "step": "Query routed",
            "detail": routing["routing_reason"],
        },

        {
            "step": "Task selected",
            "detail": routing["task"],
        },

    ]

    if specialist_ran and result is not None:

        trace.append(
            {
                "step": "Specialist invoked",
                "detail": result.get(
                    "specialist",
                    ""
                ),
            }
        )

        trace.append(
            {
                "step": "Model status",
                "detail": result.get(
                    "message",
                    ""
                ),
            }
        )

    return trace


# ---------------------------------------------------------------------------
# GET /preview/{image_id}
# ---------------------------------------------------------------------------

@app.get("/preview/{image_id}")
def preview(image_id: str):
    """
    Generate an RGB preview from a multi-band GeoTIFF.

    For Sentinel-2:
        B04 = Red
        B03 = Green
        B02 = Blue
    """

    image = IMAGE_STORE.get(image_id)

    if image is None:

        raise HTTPException(
            status_code=404,
            detail="Unknown image_id."
        )

    preview_path = os.path.join(
        UPLOAD_DIR,
        f"{image_id}_preview.png"
    )

    # Return cached preview if available
    if os.path.exists(preview_path):

        return FileResponse(
            preview_path,
            media_type="image/png"
        )

    # =========================================================
    # Generate RGB preview
    # =========================================================

    try:

        import tifffile
        import numpy as np
        from PIL import Image

        data = tifffile.imread(
            image["path"]
        )

        # -----------------------------------------------------
        # Single-band image
        # -----------------------------------------------------

        if data.ndim == 2:

            arr = data.astype(
                np.float32
            )

            arr = (
                (arr - arr.min())
                /
                (
                    arr.max()
                    - arr.min()
                    + 1e-6
                )
                * 255
            )

            img = Image.fromarray(
                arr.astype(np.uint8),
                mode="L"
            )

        # -----------------------------------------------------
        # Multi-band image
        # -----------------------------------------------------

        elif data.ndim == 3:

            # Convert H,W,B -> B,H,W
            if data.shape[2] <= 12:

                data = np.transpose(
                    data,
                    (2, 0, 1)
                )

            bands = data.shape[0]

            # -------------------------------------------------
            # Sentinel-2
            # -------------------------------------------------

            if bands >= 4:

                # B04 = Red
                # B03 = Green
                # B02 = Blue

                rgb = np.stack(
                    [
                        data[3],
                        data[2],
                        data[1],
                    ]
                ).astype(np.float32)

            # -------------------------------------------------
            # Standard RGB
            # -------------------------------------------------

            elif bands == 3:

                rgb = data.astype(
                    np.float32
                )

            # -------------------------------------------------
            # SAR / 2-band
            # -------------------------------------------------

            elif bands == 2:

                composite = (
                    data[0].astype(np.float32)
                    +
                    data[1].astype(np.float32)
                ) / 2

                arr = (
                    (composite - composite.min())
                    /
                    (
                        composite.max()
                        - composite.min()
                        + 1e-6
                    )
                    * 255
                )

                img = Image.fromarray(
                    arr.astype(np.uint8),
                    mode="L"
                )

                img.save(preview_path)

                return FileResponse(
                    preview_path,
                    media_type="image/png"
                )

            # -------------------------------------------------
            # Single-band fallback
            # -------------------------------------------------

            else:

                rgb = np.stack(
                    [
                        data[0],
                        data[0],
                        data[0],
                    ]
                ).astype(np.float32)

            # -------------------------------------------------
            # Normalize RGB
            # -------------------------------------------------

            for i in range(3):

                band = rgb[i]

                p2 = np.percentile(
                    band,
                    2
                )

                p98 = np.percentile(
                    band,
                    98
                )

                band = np.clip(
                    (
                        (band - p2)
                        /
                        (
                            p98
                            - p2
                            + 1e-6
                        )
                        * 255
                    ),
                    0,
                    255
                )

                rgb[i] = band

            rgb = np.transpose(
                rgb,
                (1, 2, 0)
            ).astype(np.uint8)

            img = Image.fromarray(
                rgb
            )

        else:

            raise ValueError(
                f"Unexpected TIFF shape: {data.shape}"
            )

        # Save preview
        img.save(
            preview_path
        )

        return FileResponse(
            preview_path,
            media_type="image/png"
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate preview: {e}"
        )