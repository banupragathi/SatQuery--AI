"""
caption.py  ---  Captioning / Scene Description specialist
Describes a satellite scene using a real model (Gemini) via gemini_engine.py.
Same honest tagging and fallback as the VQA specialist.
"""

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
        f"User request: {query}"
    )


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
        answer_text = run_gemini(image_path, _build_prompt(query))
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
        "confidence": None,
        "evidence": None,
    }