"""
vqa.py  ---  Visual Question Answering specialist
Answers a specific question about a satellite image using a real model
(Gemini) via gemini_engine.py. Gemini is general-purpose, so answers are
tagged honestly. Missing key or failed call -> honest pending/error state.
"""

from gemini_engine import run_gemini, is_configured, GeminiError

SPECIALIST_NAME = "VQA"
MODEL_SLOT = "Gemini (general-purpose VLM)"


def _build_prompt(query: str) -> str:
    return (
        "You are analysing a satellite / aerial remote-sensing image. "
        "Answer the user's question based ONLY on what is visibly present in "
        "the image. Be concise and specific. If the image does not contain "
        "enough information to answer, say so honestly rather than guessing.\n\n"
        f"User question: {query}"
    )


def analyze(image_path: str, query: str) -> dict:
    if not is_configured():
        return {
            "task": "Visual Question Answering",
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
            "task": "Visual Question Answering",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": f"Model call failed: {e}",
            "confidence": None,
            "evidence": None,
        }

    return {
        "task": "Visual Question Answering",
        "specialist": SPECIALIST_NAME,
        "model": MODEL_SLOT,
        "model_connected": True,
        "answer": answer_text,
        "message": "Answered by a general-purpose model (Gemini). "
                   "Remote-sensing-adapted model is the fine-tuned specialist.",
        "confidence": None,
        "evidence": None,
    }