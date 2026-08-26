"""
remote_sensing.py  ---  BigEarthNet land-cover specialist
=========================================================

SatQuery's GENUINE remote-sensing adapted model. Satisfies the PS requirement:
"at least one visual or VL component must be fine-tuned or otherwise adapted
using BigEarthNet."

Takes a 12-band Sentinel-2 GeoTIFF, normalizes with exact training stats,
runs the fine-tuned ResNet-18, returns 19 land-cover predictions with REAL
confidence scores (sigmoid probabilities — not invented numbers).

Cannot process JPG/PNG (3 channels). Manager routes RGB -> Gemini,
multispectral GeoTIFF -> this specialist.

Checkpoint dict keys: model_state_dict, band_mean, band_std, classes,
f1, precision, recall, val_loss.
"""

import os
import torch
import torch.nn as nn
from torchvision.models import resnet18

SPECIALIST_NAME = "LAND_COVER"
MODEL_SLOT = "BigEarthNet ResNet-18 (fine-tuned)"

CHECKPOINT_PATH = os.path.join(
    os.path.dirname(__file__), "models", "satquery_bigearthnet_best.pth"
)

# Module-level cache (loaded once, reused)
_model = None
_band_mean = None
_band_std = None
_classes = None
_training_metrics = None


def _load_model():
    global _model, _band_mean, _band_std, _classes, _training_metrics

    if _model is not None:
        return

    if not os.path.exists(CHECKPOINT_PATH):
        raise FileNotFoundError(
            f"BigEarthNet checkpoint not found at {CHECKPOINT_PATH}."
        )

    checkpoint = torch.load(CHECKPOINT_PATH, map_location="cpu", weights_only=False)

    _band_mean = checkpoint["band_mean"]
    _band_std = checkpoint["band_std"]
    _classes = checkpoint["classes"]

    _training_metrics = {
        "f1": checkpoint.get("f1"),
        "precision": checkpoint.get("precision"),
        "recall": checkpoint.get("recall"),
        "val_loss": checkpoint.get("val_loss"),
    }

    num_classes = len(_classes)

    model = resnet18(weights=None)
    model.conv1 = nn.Conv2d(12, 64, kernel_size=7, stride=2, padding=3, bias=False)
    model.fc = nn.Linear(model.fc.in_features, num_classes)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    _model = model


def is_configured() -> bool:
    return os.path.exists(CHECKPOINT_PATH)


def _is_geotiff(image_path: str) -> bool:
    ext = os.path.splitext(image_path)[1].lower()
    return ext in (".tif", ".tiff", ".geotiff")


def _load_geotiff_bands(image_path: str) -> torch.Tensor:
    try:
        import rasterio
        with rasterio.open(image_path) as src:
            data = src.read()
        return torch.tensor(data, dtype=torch.float32)
    except ImportError:
        pass

    try:
        import tifffile
        import numpy as np
        data = tifffile.imread(image_path)
        if data.ndim == 2:
            data = data[None, :, :]
        elif data.ndim == 3 and data.shape[2] <= 12:
            data = np.transpose(data, (2, 0, 1))
        return torch.tensor(data, dtype=torch.float32)
    except ImportError:
        raise ImportError(
            "Neither rasterio nor tifffile is installed. Run: "
            "pip install rasterio  OR  pip install tifffile"
        )


def _normalize_and_resize(tensor: torch.Tensor) -> torch.Tensor:
    mean = _band_mean.view(12, 1, 1)
    std = _band_std.view(12, 1, 1)
    tensor = (tensor - mean) / std
    tensor = tensor.unsqueeze(0)
    tensor = nn.functional.interpolate(
        tensor, size=(60, 60), mode="bilinear", align_corners=False
    )
    return tensor


def analyze(image_path: str, query: str) -> dict:
    if not is_configured():
        return {
            "task": "Land-Cover Classification",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": "BigEarthNet checkpoint not found in backend/models/.",
            "confidence": None,
            "evidence": None,
        }

    if not _is_geotiff(image_path):
        return {
            "task": "Land-Cover Classification",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": True,
            "answer": None,
            "message": (
                "This specialist requires a 12-band Sentinel-2 GeoTIFF. "
                "The uploaded image appears to be a standard RGB file. "
                "Try a VQA or captioning query instead, or upload a "
                "multispectral GeoTIFF."
            ),
            "confidence": None,
            "evidence": None,
        }

    try:
        _load_model()

        bands = _load_geotiff_bands(image_path)

        if bands.shape[0] != 12:
            return {
                "task": "Land-Cover Classification",
                "specialist": SPECIALIST_NAME,
                "model": MODEL_SLOT,
                "model_connected": True,
                "answer": None,
                "message": (
                    f"Expected 12 spectral bands but found {bands.shape[0]}. "
                    f"This model was trained on 12-band Sentinel-2 data."
                ),
                "confidence": None,
                "evidence": None,
            }

        input_tensor = _normalize_and_resize(bands)

        with torch.no_grad():
            logits = _model(input_tensor)
            probs = torch.sigmoid(logits).squeeze(0)

        ranked = sorted(
            zip(_classes, probs.tolist()),
            key=lambda x: x[1],
            reverse=True,
        )

        THRESHOLD = 0.15
        top_predictions = [
            {"class": name, "confidence": round(prob, 4)}
            for name, prob in ranked
            if prob >= THRESHOLD
        ]

        if not top_predictions:
            top_predictions = [
                {"class": name, "confidence": round(prob, 4)}
                for name, prob in ranked[:3]
            ]

        answer_parts = [
            f"{p['class']} ({p['confidence']*100:.1f}%)"
            for p in top_predictions
        ]
        answer_text = "Land-cover predictions: " + ", ".join(answer_parts) + "."

        top_confidence = top_predictions[0]["confidence"] if top_predictions else None

        return {
            "task": "Land-Cover Classification",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": True,
            "answer": answer_text,
            "message": (
                "Classified by a ResNet-18 fine-tuned on BigEarthNet "
                f"(Micro F1: {_training_metrics.get('f1', 0):.4f} on validation). "
                "This is a genuine remote-sensing adapted model."
            ),
            "confidence": f"{top_confidence*100:.1f}%" if top_confidence else None,
            "evidence": {
                "type": "land_cover_scores",
                "predictions": top_predictions,
                "all_scores": [
                    {"class": name, "confidence": round(prob, 4)}
                    for name, prob in ranked
                ],
            },
        }

    except Exception as e:
        return {
            "task": "Land-Cover Classification",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": f"Model inference failed: {e}",
            "confidence": None,
            "evidence": None,
        }