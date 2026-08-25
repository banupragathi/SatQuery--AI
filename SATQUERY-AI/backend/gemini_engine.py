"""
gemini_engine.py  ---  The one place that talks to the Gemini API
==================================================================

Both VQA and Captioning send an image + prompt to a real model through here.
Written once, called by both. Gemini is GENERAL-PURPOSE, so every result is
tagged honestly. The key is read from the GEMINI_API_KEY environment
variable — never written in this file, never committed to git.
"""

import os

GEMINI_MODEL = "gemini-3.6-flash"


class GeminiError(Exception):
    """Raised when we cannot get a real answer from Gemini for any reason."""
    pass


def is_configured() -> bool:
    """True only if an API key is present in the environment."""
    return bool(os.environ.get("GEMINI_API_KEY", "").strip())


def run_gemini(image_path: str, prompt: str) -> str:
    """Send one image + one text prompt to Gemini and return the text answer."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise GeminiError("GEMINI_API_KEY is not set in the environment.")

    try:
        import google.generativeai as genai
        from PIL import Image
    except ImportError as e:
        raise GeminiError(
            "Required library not installed. Run: "
            "pip install google-generativeai pillow"
        ) from e

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(GEMINI_MODEL)
        img = Image.open(image_path)
        response = model.generate_content([prompt, img])
        text = (response.text or "").strip()
        if not text:
            raise GeminiError("Gemini returned an empty response.")
        return text
    except GeminiError:
        raise
    except Exception as e:
        raise GeminiError(f"Gemini API call failed: {e}") from e