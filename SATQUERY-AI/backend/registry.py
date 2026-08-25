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

# Task label  ->  the function that handles it.
# Every specialist function has the SAME shape: analyze(image_path, query).
# Only VQA and CAPTION are active right now. Future specialists
# (CHANGE, GROUNDING, OPTICAL_SAR) will be added here as they are built.
SPECIALISTS = {
    "VQA": vqa.analyze,
    "CAPTION": caption.analyze,
    # "CHANGE": change.analyze,          # Phase 3
    # "GROUNDING": grounding.analyze,    # Phase 4
    # "OPTICAL_SAR": optical_sar.analyze # Phase 5
}


def get_specialist(task: str):
    """
    Return the specialist function for a given task label.

    Parameters
    ----------
    task : str
        A task label such as "VQA" or "CAPTION".

    Returns
    -------
    callable | None
        The specialist's analyze() function, or None if no specialist is
        registered for that task yet. main.py handles the None case
        gracefully instead of crashing.
    """
    return SPECIALISTS.get(task)


def available_tasks() -> list:
    """List the task labels that currently have an active specialist."""
    return list(SPECIALISTS.keys())
