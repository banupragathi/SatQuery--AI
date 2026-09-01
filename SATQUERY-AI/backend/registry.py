"""
registry.py
===========

The Specialist Registry is a lookup table. It maps a TASK label (produced
by the Manager) to the specialist function that handles that task.

This is the ONE place that knows which specialists exist. Because of that,
adding a new capability later is a three-step change and requires NO edits
to the Manager or to main.py's core logic:

    1. Write a new module, e.g. backend/change.py, with a function
       analyze(image_path, query) -> dict
    2. Import it here.
    3. Add one line to SPECIALISTS below, e.g. "CHANGE": change.analyze

That's the whole extensibility story. No classes, no framework.
"""



import vqa
import caption
import grounding
import remote_sensing
import change

SPECIALISTS = {
    "VQA": {
        "func": vqa.analyze,
        "capability": "Use for answering specific textual questions about the image, extracting facts, or detecting if a feature exists.",
        "requires_context": False,
        "output_type": "Textual answer"
    },
    "CAPTION": {
        "func": caption.analyze,
        "capability": "Use for generating broad overviews, summaries, and general descriptions of the entire scene.",
        "requires_context": False,
        "output_type": "Textual description"
    },
    "GROUNDING": {
        "func": grounding.analyze,
        "capability": "Use for locating, pinpointing, highlighting, or drawing bounding boxes around specific objects in the image based on user request (e.g. 'show it', 'where is the lake').",
        "requires_context": True, # Usually relies on VQA or CAPTION to confirm existence first
        "output_type": "Visual bounding boxes and coordinates"
    },
    "LAND_COVER": {
        "func": remote_sensing.analyze,
        "capability": "Use for precise environmental land-cover classification and identifying terrain types.",
        "requires_context": False,
        "output_type": "Textual classification"
    },
    "CHANGE": {
        "func": change.analyze,
        "capability": "Use specifically for change detection when comparing TWO temporal images side-by-side.",
        "requires_context": False,
        "output_type": "Textual description of changes"
    }
}

def get_specialist(task: str):
    """Return the specialist function for a given task label."""
    spec = SPECIALISTS.get(task)
    return spec["func"] if spec else None

def get_specialist_metadata(task: str) -> dict:
    """Return the capability metadata for a specialist."""
    return SPECIALISTS.get(task)

def get_all_capabilities() -> dict:
    """Return a dictionary of all active specialists and their metadata descriptions."""
    return {k: {
        "capability": v["capability"],
        "requires_context": v["requires_context"],
        "output_type": v["output_type"]
    } for k, v in SPECIALISTS.items()}

def available_tasks() -> list:
    """List the task labels that currently have an active specialist."""
    return list(SPECIALISTS.keys())
