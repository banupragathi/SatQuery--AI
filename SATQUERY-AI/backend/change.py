"""
change.py — Bi-temporal change analysis specialist
Compares two satellite images from different dates using Gemini.
"""

import re
import logging
from gemini_engine import run_gemini_multi, is_configured, GeminiError

logger = logging.getLogger("satquery.change")

SPECIALIST_NAME = "CHANGE"
MODEL_SLOT = "Gemini (general-purpose VLM)"


def analyze(image_paths: list, query: str) -> dict:
    if not is_configured():
        return {
            "task": "Change Analysis (Bi-temporal)",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": "AI model integration pending (no API key configured).",
            "confidence": None,
            "evidence": None,
        }

    if not isinstance(image_paths, list) or len(image_paths) < 2:
        return {
            "task": "Change Analysis (Bi-temporal)",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": True,
            "answer": None,
            "message": "Change analysis requires at least 2 images. Please upload a bi-temporal pair.",
            "confidence": None,
            "evidence": None,
        }

    prompt = (
        "You are an expert satellite imagery analyst. "
        "You are given TWO satellite images of the SAME geographic area "
        "taken at DIFFERENT times. The first image is EARLIER, the second is LATER.\n\n"
        "Compare both images and describe:\n"
        "1. What features APPEARED (new buildings, roads, cleared land)\n"
        "2. What features DISAPPEARED (removed vegetation, dried water)\n"
        "3. What areas EXPANDED or SHRUNK\n"
        "4. What land cover types CHANGED\n\n"
        "Be specific about WHERE changes occurred (northern portion, eastern edge, etc). "
        "Only describe changes you can actually see.\n\n"
        f"User question: {query}\n\n"
        "After your analysis, on a NEW line, write exactly: "
        "CONFIDENCE: <number>% "
        "where <number> is your honest confidence (0-100) in your analysis."
    )

    try:
        raw = run_gemini_multi(image_paths[:2], prompt)

        # Parse real confidence from response
        match = re.search(r'CONFIDENCE:\s*(\d{1,3})%', raw, re.IGNORECASE)
        if match:
            conf = max(0, min(100, int(match.group(1))))
            answer = re.sub(r'\n*\s*CONFIDENCE:\s*\d{1,3}%.*', '', raw, flags=re.IGNORECASE).strip()
            confidence = f"{conf}% (model self-assessment)"
        else:
            answer = raw.strip()
            confidence = None

        return {
            "task": "Change Analysis (Bi-temporal)",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": True,
            "answer": answer,
            "message": "Analyzed by Gemini (general-purpose VLM). "
                       "A purpose-built temporal model (TEOChat) is the planned upgrade.",
            "confidence": confidence,
            "evidence": {
                "type": "change_analysis",
                "images_compared": len(image_paths[:2]),
            },
        }

    except Exception as e:
        logger.error(f"Change specialist failed: {e}")
        return {
            "task": "Change Analysis (Bi-temporal)",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": f"Model call failed: {e}",
            "confidence": None,
            "evidence": None,
        }