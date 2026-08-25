"""
caption.py  ---  Captioning / Scene Description specialist
==========================================================

This specialist will eventually produce a natural-language description of a
whole satellite scene ("Describe the land cover in this image.") using a
real remote-sensing Vision-Language Model.

Like the VQA specialist, NO MODEL IS CONNECTED YET, and we do not fake
results. analyze() returns an honest "model not connected yet" state that
the frontend displays directly.

The structure mirrors vqa.py on purpose: every specialist exposes the same
analyze(image_path, query) function and returns the same shape of result.
That uniformity is what keeps the registry and the Manager simple.
"""

SPECIALIST_NAME = "CAPTION"
MODEL_SLOT = "Remote-Sensing Vision-Language Model"
MODEL_CONNECTED = False


def analyze(image_path: str, query: str) -> dict:
    """
    Produce a description of the scene.

    Parameters
    ----------
    image_path : str
        Path to the validated, stored image on the server.
    query : str
        The user's natural-language request (e.g. "Describe this image.").

    Returns
    -------
    dict
        Structured result. 'answer' is None until a real model is connected.
    """
    if not MODEL_CONNECTED:
        return {
            "task": "Captioning / Scene Description",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": "AI model integration pending.",
            "confidence": None,
            "evidence": None,
        }

    # --- Phase 2 will replace this with a real model call. ---
    raise NotImplementedError("Caption model is marked connected but analyze() is not implemented.")
