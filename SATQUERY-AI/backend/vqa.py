"""
vqa.py  ---  Visual Question Answering specialist
=================================================

This specialist will eventually answer specific questions about a satellite
image ("Is there a water body?", "Are there built-up areas?") using a real
remote-sensing Vision-Language Model (VLM).

RIGHT NOW NO MODEL IS CONNECTED. This is deliberate. We do not fake AI
answers. Instead, analyze() returns an honest, clearly-labelled
"model not connected yet" result. The frontend shows this as-is.

When we connect a real model (Phase 2), the ONLY change here is inside
analyze(): load the model, run it on the image + query, and fill in the
"answer" field with the model's real output. Nothing else in the system
needs to change, because every specialist keeps this same function shape.
"""

# Human-readable name of the specialist, shown in the result panel.
SPECIALIST_NAME = "VQA"

# Description of the model slot this specialist will use once connected.
MODEL_SLOT = "Remote-Sensing Vision-Language Model"

# Flag: flip to True once a real model is wired in. main.py / the frontend
# can read this to decide whether the answer is real or a pending state.
MODEL_CONNECTED = False


def analyze(image_path: str, query: str) -> dict:
    """
    Analyze an image to answer a specific question.

    Parameters
    ----------
    image_path : str
        Path to the validated, stored image on the server.
    query : str
        The user's natural-language question.

    Returns
    -------
    dict
        A structured result. The 'answer' is None until a real model is
        connected, and 'model_connected' says so plainly so the frontend
        never has to guess.
    """
    if not MODEL_CONNECTED:
        return {
            "task": "Visual Question Answering",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": "AI model integration pending.",
            "confidence": None,
            "evidence": None,
        }

    # --- Phase 2 will replace everything below with a real model call. ---
    # Example of the shape it will return:
    # answer = model.answer_question(image_path, query)
    # return {
    #     "task": "Visual Question Answering",
    #     "specialist": SPECIALIST_NAME,
    #     "model": MODEL_SLOT,
    #     "model_connected": True,
    #     "answer": answer.text,
    #     "message": "Completed.",
    #     "confidence": answer.confidence,
    #     "evidence": answer.evidence,
    # }
    raise NotImplementedError("VQA model is marked connected but analyze() is not implemented.")
