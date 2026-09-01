"""
vqa.py — Visual Question Answering specialist
Answers questions about satellite images using Gemini.
Now includes confidence self-assessment parsed from the response.
"""

import re
from gemini_engine import run_gemini, is_configured, GeminiError

SPECIALIST_NAME = "VQA"
MODEL_SLOT = "Gemini (general-purpose VLM)"


def _build_prompt(query: str) -> str:
    return (
        "You are analysing a satellite / aerial remote-sensing image. "
        "Answer the user's question based ONLY on what is visibly present in "
        "the image. Be concise and specific. IF the query contains multiple parts, focus solely on the part assigned as your SPECIFIC task. "
        "CRITICALLY: Do NOT recount a full general description of the image. Just answer the exact specific question asked.\n\n"
        f"User instruction: {query}\n\n"
        "After your answer, on a NEW line, write exactly: "
        "CONFIDENCE: <number>% "
        "where <number> is your honest self-assessed confidence from 0 to 100 "
        "in your answer's accuracy. Base this on how clearly the image shows "
        "the relevant features."
    )


def _parse_confidence(text: str) -> tuple:
    """
    Split the answer text from the CONFIDENCE: XX% line.
    Returns (clean_answer, confidence_string_or_None).
    """
    match = re.search(r'CONFIDENCE:\s*(\d{1,3})%', text, re.IGNORECASE)
    if match:
        conf_value = int(match.group(1))
        conf_value = max(0, min(100, conf_value))
        # Remove the confidence line from the answer
        clean = re.sub(r'\n*\s*CONFIDENCE:\s*\d{1,3}%.*', '', text, flags=re.IGNORECASE).strip()
        return clean, f"{conf_value}% (model self-assessment)"
    return text.strip(), None


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
        raw_answer = run_gemini(image_path, _build_prompt(query))
        answer_text, confidence = _parse_confidence(raw_answer)
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
        "confidence": confidence,
        "evidence": None,
    }