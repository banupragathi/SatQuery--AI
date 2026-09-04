"""
registry.py — Maps task labels to specialist functions.
Adding a new capability: 1 import + 1 line in SPECIALISTS.
"""

import vqa
import caption
import grounding
import remote_sensing
import change
import optical_sar

SPECIALISTS = {
    "VQA": vqa.analyze,
    "CAPTION": caption.analyze,
    "GROUNDING": grounding.analyze,
    "LAND_COVER": remote_sensing.analyze,
    "CHANGE": change.analyze,
    "OPTICAL_SAR": optical_sar.analyze, 
}

MULTI_IMAGE_TASKS = {"CHANGE", "OPTICAL_SAR"}

CAPABILITIES = {
    "VQA": {
        "capability": "Answer questions about satellite images",
        "requires_context": False,
        "output_type": "answer",
    },
    "CAPTION": {
        "capability": "Generate descriptions of satellite images",
        "requires_context": False,
        "output_type": "caption",
    },
    "GROUNDING": {
        "capability": "Locate or identify requested objects in images",
        "requires_context": False,
        "output_type": "locations",
    },
    "LAND_COVER": {
        "capability": "Classify land-cover types using trained BigEarthNet model",
        "requires_context": False,
        "output_type": "classification",
    },
    "CHANGE": {
        "capability": "Detect changes between bi-temporal satellite images",
        "requires_context": True,
        "output_type": "change analysis",
    },
    "OPTICAL_SAR": {
        "capability": "Cross-modal analysis combining optical and SAR imagery",
        "requires_context": True,
        "output_type": "fusion analysis",
    },
}


def get_all_capabilities() -> dict:
    return CAPABILITIES


def get_specialist_metadata(task: str) -> dict | None:
    return CAPABILITIES.get(task)


def get_specialist(task: str):
    return SPECIALISTS.get(task)


def is_multi_image_task(task: str) -> bool:
    return task in MULTI_IMAGE_TASKS


def available_tasks() -> list:
    return list(SPECIALISTS.keys())