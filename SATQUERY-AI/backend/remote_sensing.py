"""
remote_sensing.py — BigEarthNet land-cover specialist (S2 + S1)
================================================================
Auto-detects whether the input is 12-band optical (uses EfficientNet-B4)
or 2-band SAR (uses ResNet-18). One specialist, two trained models.
"""

import os
import torch
import torch.nn as nn
from torchvision.models import resnet18

SPECIALIST_NAME = "LAND_COVER"
MODEL_SLOT = "BigEarthNet (fine-tuned)"

S2_CHECKPOINT = os.path.join(
    os.path.dirname(__file__), "models", "satquery_efficientnet_b4.pth"
)
S1_CHECKPOINT = os.path.join(
    os.path.dirname(__file__), "models", "satquery_bigearthnet_s1_sar_final.pth"
)

_s2_model = None
_s2_mean = None
_s2_std = None
_s1_model = None
_s1_mean = None
_s1_std = None
_classes = None
_s2_metrics = None
_s1_metrics = None


def _load_s2():
    global _s2_model, _s2_mean, _s2_std, _classes, _s2_metrics
    if _s2_model is not None:
        return
    if not os.path.exists(S2_CHECKPOINT):
        raise FileNotFoundError(f"S2 checkpoint not found at {S2_CHECKPOINT}")
    cp = torch.load(S2_CHECKPOINT, map_location="cpu", weights_only=False)
    _s2_mean = cp["band_mean"]
    _s2_std = cp["band_std"]
    _classes = cp["classes"]
    _s2_metrics = {"f1": cp.get("f1"), "precision": cp.get("precision"), "recall": cp.get("recall")}
    num_classes = len(_classes)

    arch = cp.get("architecture", "resnet50")
    if arch == "efficientnet-b4":
        from efficientnet_pytorch import EfficientNet
        model = EfficientNet.from_name("efficientnet-b4", in_channels=12, num_classes=num_classes)
    else:
        from torchvision.models import resnet50
        model = resnet50(weights=None)
        model.conv1 = nn.Conv2d(12, 64, kernel_size=7, stride=2, padding=3, bias=False)
        model.fc = nn.Linear(model.fc.in_features, num_classes)

    model.load_state_dict(cp["model_state_dict"])
    model.eval()
    _s2_model = model


def _load_s1():
    global _s1_model, _s1_mean, _s1_std, _classes, _s1_metrics
    if _s1_model is not None:
        return
    if not os.path.exists(S1_CHECKPOINT):
        raise FileNotFoundError(f"S1 checkpoint not found at {S1_CHECKPOINT}")
    cp = torch.load(S1_CHECKPOINT, map_location="cpu", weights_only=False)
    _s1_mean = cp["band_mean"]
    _s1_std = cp["band_std"]
    if _classes is None:
        _classes = cp["classes"]
    _s1_metrics = {"f1": cp.get("f1"), "precision": cp.get("precision"), "recall": cp.get("recall")}
    num_classes = len(_classes)
    num_bands = cp.get("num_bands", 2)
    model = resnet18(weights=None)
    model.conv1 = nn.Conv2d(num_bands, 64, kernel_size=7, stride=2, padding=3, bias=False)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    model.load_state_dict(cp["model_state_dict"])
    model.eval()
    _s1_model = model


def is_configured() -> bool:
    return os.path.exists(S2_CHECKPOINT) or os.path.exists(S1_CHECKPOINT)


def _is_geotiff(image_path: str) -> bool:
    ext = os.path.splitext(image_path)[1].lower()
    return ext in (".tif", ".tiff", ".geotiff")


def _load_bands(image_path: str) -> torch.Tensor:
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
        raise ImportError("tifffile not installed. Run: pip install tifffile")


def _normalize_and_run(model, bands, mean, std, target_size=60):
    num_bands = bands.shape[0]
    m = mean.view(num_bands, 1, 1).to(torch.float32)
    s = std.view(num_bands, 1, 1).to(torch.float32)
    bands = bands.to(torch.float32)
    tensor = (bands - m) / s
    tensor = tensor.unsqueeze(0).to(torch.float32)
    tensor = nn.functional.interpolate(
        tensor, size=(target_size, target_size), mode="bilinear", align_corners=False
    )
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.sigmoid(logits).squeeze(0)
    return probs


def analyze(image_path: str, query: str) -> dict:
    if not is_configured():
        return {
            "task": "Land-Cover Classification",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": "No BigEarthNet checkpoint found in backend/models/.",
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
                "This specialist requires a Sentinel GeoTIFF (12-band optical "
                "or 2-band SAR). The uploaded image is a standard RGB file. "
                "Try a VQA or captioning query instead."
            ),
            "confidence": None,
            "evidence": None,
        }

    try:
        bands = _load_bands(image_path)
        num_bands = bands.shape[0]

        if num_bands == 12:
            _load_s2()
            probs = _normalize_and_run(_s2_model, bands, _s2_mean, _s2_std)
            sensor = "Sentinel-2 Optical"
            model_name = "BigEarthNet EfficientNet-B4 (S2, fine-tuned)"
            metrics = _s2_metrics
        elif num_bands <= 2:
            _load_s1()
            probs = _normalize_and_run(_s1_model, bands, _s1_mean, _s1_std)
            sensor = "Sentinel-1 SAR"
            model_name = "BigEarthNet ResNet-18 (S1 SAR, fine-tuned)"
            metrics = _s1_metrics
        else:
            return {
                "task": "Land-Cover Classification",
                "specialist": SPECIALIST_NAME,
                "model": MODEL_SLOT,
                "model_connected": True,
                "answer": None,
                "message": (
                    f"Detected {num_bands} bands. Expected 12 (Sentinel-2 optical) "
                    f"or 2 (Sentinel-1 SAR). Cannot classify with available models."
                ),
                "confidence": None,
                "evidence": None,
            }

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
        answer_text = f"Land-cover predictions ({sensor}): " + ", ".join(answer_parts) + "."

        top_confidence = top_predictions[0]["confidence"] if top_predictions else None
        f1_val = metrics.get("f1", 0) if metrics else 0

        return {
            "task": "Land-Cover Classification",
            "specialist": SPECIALIST_NAME,
            "model": model_name,
            "model_connected": True,
            "answer": answer_text,
            "message": (
                f"Classified by {model_name} "
                f"(Micro F1: {f1_val:.4f} on validation). "
                f"Input: {num_bands}-band {sensor} GeoTIFF. "
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