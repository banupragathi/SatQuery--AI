"""
caption.py — Captioning / Scene Description specialist
Describes satellite scenes using Gemini. Includes confidence self-assessment.
"""

import re
from gemini_engine import run_gemini, is_configured, GeminiError

SPECIALIST_NAME = "CAPTION"
MODEL_SLOT = "Gemini (general-purpose VLM)"


def _build_prompt(query: str) -> str:
    return (
        "You are analysing a satellite / aerial remote-sensing image. "
        "Give a clear, factual description of the land cover and notable "
        "features visible in the scene (for example: water bodies, vegetation, "
        "built-up/urban areas, bare land, agricultural fields, roads). "
        "Describe only what is visibly present. Be concise.\n\n"
        f"User request: {query}\n\n"
        "After your description, on a NEW line, write exactly: "
        "CONFIDENCE: <number>% "
        "where <number> is your honest self-assessed confidence from 0 to 100 "
        "in your description's accuracy. Base this on how clearly the image "
        "shows the features you described."
    )


def _parse_confidence(text: str) -> tuple:
    match = re.search(r'CONFIDENCE:\s*(\d{1,3})%', text, re.IGNORECASE)
    if match:
        conf_value = int(match.group(1))
        conf_value = max(0, min(100, conf_value))
        clean = re.sub(r'\n*\s*CONFIDENCE:\s*\d{1,3}%.*', '', text, flags=re.IGNORECASE).strip()
        return clean, f"{conf_value}% (model self-assessment)"
    return text.strip(), None


def analyze(image_path: str, query: str) -> dict:
    if not is_configured():
        return {
            "task": "Captioning / Scene Description",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": "AI model integration pending (no API key configured).",
            "confidence": None,
            "evidence": None,
        }

    try:
        raw_answer = run_gemini(image_path, _build_prompt(query))
        answer_text, confidence = _parse_confidence(raw_answer)
    except GeminiError as e:
        return {
            "task": "Captioning / Scene Description",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": f"Model call failed: {e}",
            "confidence": None,
            "evidence": None,
        }

    return {
        "task": "Captioning / Scene Description",
        "specialist": SPECIALIST_NAME,
        "model": MODEL_SLOT,
        "model_connected": True,
        "answer": answer_text,
        "message": "Described by a general-purpose model (Gemini). "
                   "Remote-sensing-adapted model is the fine-tuned specialist.",
        "confidence": confidence,
        "evidence": None,
    }