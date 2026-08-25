"""
gemini_engine.py  ---  The one place that talks to the Gemini API
==================================================================

Both VQA and Captioning send an image + prompt to a real model through here.
Written once, called by both. Gemini is GENERAL-PURPOSE, so every result is
tagged honestly. The key is read from the GEMINI_API_KEY environment
variable — never written in this file, never committed to git.
"""

import os
import base64
import logging
import requests

logger = logging.getLogger("satquery.gemini")

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")


class GeminiError(Exception):
    """Raised when we cannot get a real answer from Gemini for any reason."""
    pass


def _log_config():
    """Log API config at import time — never prints the actual key."""
    key = os.environ.get("GEMINI_API_KEY", "")
    key_clean = key.strip(' \t\n\r"\'')
    has_key = bool(key_clean) and key_clean not in (
        "your_gemini_api_key_here",
        "your_actual_gemini_api_key_here",
    )
    prefix = key_clean[:8] + "..." if len(key_clean) > 8 else "(empty)"
    logger.info("Gemini config  | model=%s  key_present=%s  key_prefix=%s",
                GEMINI_MODEL, has_key, prefix)


# Run once when module is first imported (i.e. at server startup)
_log_config()


def is_configured() -> bool:
    """True only if a valid API key is present in the environment."""
    key = os.environ.get("GEMINI_API_KEY", "").strip(' \t\n\r"\'')
    return bool(key) and key != "your_gemini_api_key_here" and key != "your_actual_gemini_api_key_here"


def run_gemini(image_path: str, prompt: str) -> str:
    """Send one image + one text prompt to Gemini and return the text answer."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip(' \t\n\r"\'')
    if not api_key:
        raise GeminiError("GEMINI_API_KEY is not set in the environment.")

    logger.info("Calling model=%s  image=%s  prompt_len=%d",
                GEMINI_MODEL, os.path.basename(image_path), len(prompt))

    # 1. Read, compress, or normalize image file to speed up transmission
    try:
        from PIL import Image
        import io

        file_size = os.path.getsize(image_path)
        ext = os.path.splitext(image_path)[1].lower()

        # If image is > 1MB or is PNG/TIFF, compress it to optimized JPEG for fast network upload
        if file_size > 1024 * 1024 or ext in (".png", ".tif", ".tiff"):
            with Image.open(image_path) as img:
                # Normalize color palette channels (e.g. RGBA to RGB)
                if img.mode in ("RGBA", "P", "LA"):
                    img = img.convert("RGB")

                # Limit maximum resolution to standard high-resolution (max 2048px on side)
                max_dim = 2048
                if max(img.width, img.height) > max_dim:
                    img.thumbnail((max_dim, max_dim))

                # Compress as JPEG at 85% quality
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=85)
                img_bytes = buffer.getvalue()
                mime_type = "image/jpeg"
        else:
            with open(image_path, "rb") as image_file:
                img_bytes = image_file.read()
            # Determine MIME type based on extension
            if ext in (".png",):
                mime_type = "image/png"
            elif ext in (".jpg", ".jpeg"):
                mime_type = "image/jpeg"
            elif ext in (".webp",):
                mime_type = "image/webp"
            elif ext in (".tif", ".tiff"):
                mime_type = "image/jpeg"
            else:
                mime_type = "image/jpeg"

        img_b64 = base64.b64encode(img_bytes).decode("utf-8")
    except Exception as e:
        raise GeminiError(f"Failed to process and compress image file: {e}")

    # 2. Construct the API request
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": img_b64
                        }
                    }
                ]
            }
        ]
    }

    try:
        # Increased timeout to 60 seconds for larger network buffers
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code != 200:
            try:
                err_json = response.json()
                err_msg = err_json.get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            logger.error("Gemini API error  status=%d  model=%s  msg=%s",
                         response.status_code, GEMINI_MODEL, err_msg[:200])
            raise GeminiError(f"Gemini API returned status {response.status_code}: {err_msg}")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise GeminiError("Gemini returned no response candidates.")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise GeminiError("Content parts from Gemini response are empty.")

        text = parts[0].get("text", "").strip()
        if not text:
            raise GeminiError("Gemini returned an empty text response.")

        logger.info("Gemini response OK  model=%s  response_len=%d", GEMINI_MODEL, len(text))
        return text

    except requests.exceptions.RequestException as e:
        raise GeminiError(f"HTTP request to Gemini API failed: {e}")
    except GeminiError:
        raise
    except Exception as e:
        raise GeminiError(f"Error parsing Gemini response: {e}")