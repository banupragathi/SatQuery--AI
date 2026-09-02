"""
registry.py — Maps task labels to specialist functions.
Adding a new capability: 1 import + 1 line in SPECIALISTS.
"""

import vqa
import caption
import grounding
import remote_sensing
import change

SPECIALISTS = {
    "VQA": vqa.analyze,
    "CAPTION": caption.analyze,
    "GROUNDING": grounding.analyze,
    "LAND_COVER": remote_sensing.analyze,
    "CHANGE": change.analyze,
}

# Which specialists take multiple images (list) vs single image (string)
MULTI_IMAGE_TASKS = {"CHANGE"}


def get_specialist(task: str):
    return SPECIALISTS.get(task)


def is_multi_image_task(task: str) -> bool:
    return task in MULTI_IMAGE_TASKS


def available_tasks() -> list:
    return list(SPECIALISTS.keys())