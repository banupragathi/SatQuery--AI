"""
grounding.py  ---  Text-guided region grounding specialist
Locates a region the user asks about ("Highlight the water body") and returns
a bounding box the frontend draws on the image. Uses Gemini; boxes are
approximate (general-purpose model), tagged honestly. Missing key or failed
call -> honest pending/error state, never a fake box.
"""

import json

from gemini_engine import run_gemini, is_configured, GeminiError

SPECIALIST_NAME = "GROUNDING"
MODEL_SLOT = "Gemini (general-purpose VLM)"


def _build_prompt(query: str) -> str:
    return (
        "You are analysing a satellite / aerial remote-sensing image. "
        "The user wants you to locate a specific region or object in the image.\n\n"
        f"User request: {query}\n\n"
        "Return ONE bounding box around the requested region. "
        "Respond with ONLY a JSON object, no other text, in exactly this format:\n"
        '{"label": "<short name of what you located>", '
        '"box_2d": [ymin, xmin, ymax, xmax], '
        '"found": true}\n\n'
        "The four numbers are integers from 0 to 1000 describing the box on a "
        "0-1000 grid over the image (top-left is 0,0). "
        "If the requested region is not visible in the image, return "
        '{"label": "", "box_2d": [0,0,0,0], "found": false}.'
    )


def _parse_box(raw_text: str) -> dict:
    cleaned = raw_text.strip()
    
    try:
        data = json.loads(cleaned)
    except Exception as e:
        import re
        # Fallback 1: array format [ymin, xmin, ymax, xmax]
        array_match = re.search(r'\[\s*([\d\.]+)\s*,\s*([\d\.]+)\s*,\s*([\d\.]+)\s*,\s*([\d\.]+)\s*\]', raw_text)
        
        # Fallback 2: key-value format like ymin=0, xmin=0, ymax=1000, xmax=650
        kv_match = None
        if not array_match:
            try:
                ymin = float(re.search(r'ymin\s*[=:]\s*([\d\.]+)', raw_text, re.IGNORECASE).group(1))
                xmin = float(re.search(r'xmin\s*[=:]\s*([\d\.]+)', raw_text, re.IGNORECASE).group(1))
                ymax = float(re.search(r'ymax\s*[=:]\s*([\d\.]+)', raw_text, re.IGNORECASE).group(1))
                xmax = float(re.search(r'xmax\s*[=:]\s*([\d\.]+)', raw_text, re.IGNORECASE).group(1))
                kv_match = [ymin, xmin, ymax, xmax]
            except:
                pass

        if array_match:
            data = {"box_2d": [float(array_match.group(i)) for i in range(1, 5)], "found": True, "label": ""}
        elif kv_match:
            data = {"box_2d": kv_match, "found": True, "label": ""}
        else:
            raise GeminiError(f"Could not parse grounding JSON or regex. Raw response: {raw_text}") from e

    box = data.get("box_2d") or data.get("box") or data.get("bounding_box") or data.get("bbox") or []
    if not (isinstance(box, list) and len(box) == 4):
        if isinstance(data, list) and len(data) == 4:
            box = data
        else:
            raise GeminiError("Grounding box (box_2d/box/bbox) was not a list of 4 numbers.")

    # If we found a valid 4-element box, we assume the object was successfully located
    found = bool(data.get("found", False)) or (isinstance(box, list) and len(box) == 4)
    label = str(data.get("label", "")) if isinstance(data, dict) else ""
    label = label.strip()

    if not found:
        return {"found": False, "label": label, "box": None}

    try:
        ymin, xmin, ymax, xmax = [float(v) for v in box]
    except Exception as e:
        raise GeminiError(f"Grounding box_2d contains non-numeric values: {box} | Error: {e}") from e

    # Dynamically support both 0..1 normalized range and 0..1000 pixel-grid range models
    is_normalized_to_one = all(0.0 <= v <= 1.0 for v in [ymin, xmin, ymax, xmax])
    scale = 1.0 if is_normalized_to_one else 1000.0

    x = min(xmin, xmax) / scale
    y = min(ymin, ymax) / scale
    w = abs(xmax - xmin) / scale
    h = abs(ymax - ymin) / scale

    # Keep layout boundaries relative within the viewport
    x = max(0.0, min(1.0, x))
    y = max(0.0, min(1.0, y))
    w = max(0.0, min(1.0 - x, w))
    h = max(0.0, min(1.0 - y, h))

    return {"found": True, "label": label, "box": {"x": x, "y": y, "w": w, "h": h}}


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
            "confidence": None,
            "evidence": None,
        }

    return {
        "task": "Text-Guided Region Grounding",
        "specialist": SPECIALIST_NAME,
        "model": MODEL_SLOT,
        "model_connected": True,
        "answer": f"Located: {parsed['label']}." if parsed["label"] else "Region located.",
        "message": "Located by a general-purpose model (Gemini). Box is approximate; "
                   "a remote-sensing grounding model is the later upgrade.",
        "confidence": None,
        "evidence": {
            "type": "bounding_box",
            "label": parsed["label"],
            "box": parsed["box"],
        },
    }