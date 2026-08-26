"""
grounding.py — Text-guided region grounding specialist
Locates regions and returns bounding boxes. Includes confidence.
"""

import json
import re
from gemini_engine import run_gemini, is_configured, GeminiError

SPECIALIST_NAME = "GROUNDING"
MODEL_SLOT = "Gemini (general-purpose VLM)"


def _build_prompt(query: str) -> str:
    return (
        "You are analysing a satellite / aerial remote-sensing image. "
        "The user wants you to locate a specific region or object in the image.\n\n"
        f"User request: {query}\n\n"
        "Return ONE TIGHT bounding box that closely hugs the boundary of the "
        "requested region — as small as possible while still fully containing "
        "it. Do not include surrounding land or unrelated areas.\n\n"
        "Respond with ONLY a JSON object, no other text, in exactly this format:\n"
        '{"label": "<short name of what you located>", '
        '"box_2d": [ymin, xmin, ymax, xmax], '
        '"confidence": <number from 0 to 100>, '
        '"found": true}\n\n'
        "The four box numbers are integers from 0 to 1000 describing the box on a "
        "0-1000 grid over the image (top-left is 0,0). "
        "confidence is your honest self-assessed confidence (0-100) in the box accuracy. "
        "If the requested region is not visible in the image, return "
        '{"label": "", "box_2d": [0,0,0,0], "confidence": 0, "found": false}.'
    )


def _parse_box(raw_text: str) -> dict:
    cleaned = raw_text.strip()

    try:
        data = json.loads(cleaned)
    except Exception:
        # Try stripping markdown fences
        stripped = cleaned
        if stripped.startswith("```"):
            stripped = stripped.strip("`")
            if stripped.lower().startswith("json"):
                stripped = stripped[4:]
            stripped = stripped.strip()
        try:
            data = json.loads(stripped)
        except Exception:
            # Regex fallback for array format
            array_match = re.search(
                r'\[\s*([\d\.]+)\s*,\s*([\d\.]+)\s*,\s*([\d\.]+)\s*,\s*([\d\.]+)\s*\]',
                raw_text
            )
            if array_match:
                data = {
                    "box_2d": [float(array_match.group(i)) for i in range(1, 5)],
                    "found": True,
                    "label": "",
                    "confidence": 50,
                }
            else:
                raise GeminiError(f"Could not parse grounding JSON: {raw_text}")

    found = bool(data.get("found", False))
    label = str(data.get("label", "")).strip()
    confidence = data.get("confidence", None)

    if not found:
        return {"found": False, "label": label, "box": None, "confidence": 0}

    box = data.get("box_2d") or data.get("box") or data.get("bounding_box") or data.get("bbox") or []
    if not (isinstance(box, list) and len(box) == 4):
        raise GeminiError("Grounding box was not a list of 4 numbers.")

    ymin, xmin, ymax, xmax = [float(v) for v in box]

    is_normalized = all(0.0 <= v <= 1.0 for v in [ymin, xmin, ymax, xmax])
    scale = 1.0 if is_normalized else 1000.0

    x = min(xmin, xmax) / scale
    y = min(ymin, ymax) / scale
    w = abs(xmax - xmin) / scale
    h = abs(ymax - ymin) / scale

    x = max(0.0, min(1.0, x))
    y = max(0.0, min(1.0, y))
    w = max(0.0, min(1.0 - x, w))
    h = max(0.0, min(1.0 - y, h))

    return {
        "found": True,
        "label": label,
        "box": {"x": x, "y": y, "w": w, "h": h},
        "confidence": confidence,
    }


def analyze(image_path: str, query: str) -> dict:
    if not is_configured():
        return {
            "task": "Text-Guided Region Grounding",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": "AI model integration pending (no API key configured).",
            "confidence": None,
            "evidence": None,
        }

    try:
        raw = run_gemini(image_path, _build_prompt(query))
        parsed = _parse_box(raw)
    except GeminiError as e:
        return {
            "task": "Text-Guided Region Grounding",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": f"Model call failed: {e}",
            "confidence": None,
            "evidence": None,
        }

    if not parsed["found"]:
        return {
            "task": "Text-Guided Region Grounding",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": True,
            "answer": "The requested region was not clearly visible in the image.",
            "message": "Located by a general-purpose model (Gemini). "
                       "Approximate; a remote-sensing grounding model is the upgrade.",
            "confidence": "0% (model self-assessment)",
            "evidence": None,
        }

    conf = parsed.get("confidence")
    conf_str = f"{conf}% (model self-assessment)" if conf is not None else None

    return {
        "task": "Text-Guided Region Grounding",
        "specialist": SPECIALIST_NAME,
        "model": MODEL_SLOT,
        "model_connected": True,
        "answer": f"Located: {parsed['label']}." if parsed["label"] else "Region located.",
        "message": "Located by a general-purpose model (Gemini). Box is approximate; "
                   "a remote-sensing grounding model is the later upgrade.",
        "confidence": conf_str,
        "evidence": {
            "type": "bounding_box",
            "label": parsed["label"],
            "box": parsed["box"],
        },
    }