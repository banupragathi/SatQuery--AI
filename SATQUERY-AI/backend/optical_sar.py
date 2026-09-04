"""
optical_sar.py — Cross-modal Optical + SAR fusion specialist
=============================================================

Takes two images (one optical, one SAR), runs each through its
respective trained model (S2 ResNet-50 for optical, S1 ResNet-18
for SAR), compares both outputs, and produces a fused analysis.

Where models AGREE → high confidence conclusion
Where models DISAGREE → flags complementary information
(e.g., SAR sees water under forest canopy that optical misses)

This is genuine cross-modal analysis using two independently
trained domain-adapted models — not a generic VLM guess.
"""

import os
import torch
import torch.nn as nn
from torchvision.models import resnet18, resnet50

SPECIALIST_NAME = "OPTICAL_SAR"
MODEL_SLOT = "BigEarthNet S2 + S1 (cross-modal fusion)"

# Paths to both trained checkpoints
S2_CHECKPOINT = os.path.join(
    os.path.dirname(__file__), "models", "satquery_bigearthnet_resnet50.pth"
)
S1_CHECKPOINT = os.path.join(
    os.path.dirname(__file__), "models", "satquery_bigearthnet_s1_sar_final.pth"
)

# Module-level caches (loaded once, reused)
_s2_model = None
_s2_mean = None
_s2_std = None
_s1_model = None
_s1_mean = None
_s1_std = None
_classes = None


def _load_s2_model():
    """Load the optical (Sentinel-2) model."""
    global _s2_model, _s2_mean, _s2_std, _classes

    if _s2_model is not None:
        return

    if not os.path.exists(S2_CHECKPOINT):
        raise FileNotFoundError(f"S2 checkpoint not found at {S2_CHECKPOINT}")

    cp = torch.load(S2_CHECKPOINT, map_location="cpu", weights_only=False)
    _s2_mean = cp["band_mean"]
    _s2_std = cp["band_std"]
    _classes = cp["classes"]

    num_classes = len(_classes)
    arch = cp.get("architecture", "resnet50")

    if arch == "efficientnet-b4":
        try:
            from efficientnet_pytorch import EfficientNet
            model = EfficientNet.from_name("efficientnet-b4", in_channels=12, num_classes=num_classes)
        except ImportError:
            model = resnet50(weights=None)
            model.conv1 = nn.Conv2d(12, 64, kernel_size=7, stride=2, padding=3, bias=False)
            model.fc = nn.Linear(model.fc.in_features, num_classes)
    else:
        model = resnet50(weights=None)
        model.conv1 = nn.Conv2d(12, 64, kernel_size=7, stride=2, padding=3, bias=False)
        model.fc = nn.Linear(model.fc.in_features, num_classes)

    model.load_state_dict(cp["model_state_dict"])
    model.eval()
    _s2_model = model


def _load_s1_model():
    """Load the SAR (Sentinel-1) model."""
    global _s1_model, _s1_mean, _s1_std, _classes

    if _s1_model is not None:
        return

    if not os.path.exists(S1_CHECKPOINT):
        raise FileNotFoundError(f"S1 checkpoint not found at {S1_CHECKPOINT}")

    cp = torch.load(S1_CHECKPOINT, map_location="cpu", weights_only=False)
    _s1_mean = cp["band_mean"]
    _s1_std = cp["band_std"]

    if _classes is None:
        _classes = cp["classes"]

    num_classes = len(_classes)
    num_bands = cp.get("num_bands", 2)

    model = resnet18(weights=None)
    model.conv1 = nn.Conv2d(num_bands, 64, kernel_size=7, stride=2, padding=3, bias=False)
    model.fc = nn.Linear(model.fc.in_features, num_classes)

    model.load_state_dict(cp["model_state_dict"])
    model.eval()
    _s1_model = model


def is_configured() -> bool:
    """Both model checkpoints must exist."""
    return os.path.exists(S2_CHECKPOINT) and os.path.exists(S1_CHECKPOINT)


def _is_geotiff(path: str) -> bool:
    ext = os.path.splitext(path)[1].lower()
    return ext in (".tif", ".tiff", ".geotiff")


def _load_bands(image_path: str) -> torch.Tensor:
    """Read a GeoTIFF and return [C, H, W] tensor."""
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


def _run_model(model, tensor, mean, std, target_size=60):
    """Normalize, resize, run inference, return sigmoid probabilities."""
    num_bands = tensor.shape[0]
    m = mean.view(num_bands, 1, 1)
    s = std.view(num_bands, 1, 1)
    tensor = (tensor - m) / s
    tensor = tensor.unsqueeze(0)
    tensor = nn.functional.interpolate(
        tensor, size=(target_size, target_size), mode="bilinear", align_corners=False
    )

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.sigmoid(logits).squeeze(0)

    return probs


def _fuse_results(s2_probs, s1_probs, classes):
    """
    Compare optical and SAR predictions.
    Agreement = high confidence. Disagreement = complementary insight.
    """
    THRESHOLD = 0.3
    results = []

    for i, cls in enumerate(classes):
        optical_conf = round(s2_probs[i].item(), 4)
        sar_conf = round(s1_probs[i].item(), 4)
        avg_conf = round((optical_conf + sar_conf) / 2, 4)

        # Both above threshold = agreement
        both_detect = optical_conf >= THRESHOLD and sar_conf >= THRESHOLD
        # Only one detects = complementary
        only_optical = optical_conf >= THRESHOLD and sar_conf < THRESHOLD
        only_sar = sar_conf >= THRESHOLD and optical_conf < THRESHOLD

        if both_detect:
            status = "CONFIRMED"
        elif only_optical:
            status = "OPTICAL_ONLY"
        elif only_sar:
            status = "SAR_ONLY"
        else:
            status = "NOT_DETECTED"

        results.append({
            "class": cls,
            "optical_confidence": optical_conf,
            "sar_confidence": sar_conf,
            "fused_confidence": avg_conf,
            "status": status,
        })

    # Sort by fused confidence
    results.sort(key=lambda x: x["fused_confidence"], reverse=True)
    return results


def _build_answer(fused_results):
    """Generate a human-readable cross-modal analysis."""
    confirmed = [r for r in fused_results if r["status"] == "CONFIRMED"]
    optical_only = [r for r in fused_results if r["status"] == "OPTICAL_ONLY"]
    sar_only = [r for r in fused_results if r["status"] == "SAR_ONLY"]

    parts = []

    if confirmed:
        names = [f"{r['class']} ({r['fused_confidence']*100:.1f}%)" for r in confirmed]
        parts.append("Cross-modal CONFIRMED (both sensors agree): " + ", ".join(names) + ".")

    if optical_only:
        names = [f"{r['class']} ({r['optical_confidence']*100:.1f}%)" for r in optical_only]
        parts.append("Detected by OPTICAL only: " + ", ".join(names) + ". SAR does not confirm — may indicate surface-level features not visible to radar.")

    if sar_only:
        names = [f"{r['class']} ({r['sar_confidence']*100:.1f}%)" for r in sar_only]
        parts.append("Detected by SAR only: " + ", ".join(names) + ". Optical does not confirm — may indicate subsurface features or conditions hidden by cloud/canopy.")

    if not parts:
        parts.append("No strong land-cover signals detected by either sensor above the confidence threshold.")

    return " ".join(parts)


def analyze(image_paths: list, query: str) -> dict:
    """
    Cross-modal analysis using both trained models.
    image_paths[0] = optical image, image_paths[1] = SAR image.
    """
    if not is_configured():
        missing = []
        if not os.path.exists(S2_CHECKPOINT):
            missing.append("S2 optical model")
        if not os.path.exists(S1_CHECKPOINT):
            missing.append("S1 SAR model")
        return {
            "task": "Optical + SAR Cross-Modal Analysis",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": f"Missing checkpoint(s): {', '.join(missing)}.",
            "confidence": None,
            "evidence": None,
        }

    if not isinstance(image_paths, list) or len(image_paths) < 2:
        return {
            "task": "Optical + SAR Cross-Modal Analysis",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": True,
            "answer": None,
            "message": "Cross-modal analysis requires 2 images (one optical, one SAR).",
            "confidence": None,
            "evidence": None,
        }

    try:
        _load_s2_model()
        _load_s1_model()

        # Load both images
        optical_bands = _load_bands(image_paths[0])
        sar_bands = _load_bands(image_paths[1])

        # Determine which image is optical (12 bands) and which is SAR (1-2 bands)
        # Auto-detect based on band count
        if optical_bands.shape[0] <= 2 and sar_bands.shape[0] > 2:
            # User uploaded SAR first, optical second — swap
            optical_bands, sar_bands = sar_bands, optical_bands

        # Validate band counts
        optical_ok = optical_bands.shape[0] == 12
        sar_ok = sar_bands.shape[0] <= 2

        if not optical_ok and not sar_ok:
            # Both are RGB or both are unknown — fall back to Gemini
            from gemini_engine import run_gemini_multi, is_configured as gemini_ok, GeminiError
            if gemini_ok():
                try:
                    prompt = (
                        "You are analysing TWO satellite images of the same area. "
                        "One may be optical and one may be SAR (radar). "
                        "Compare what each image reveals and describe how they "
                        "complement each other. What can you see in one that is "
                        f"not visible in the other?\n\nUser question: {query}"
                    )
                    answer = run_gemini_multi(image_paths[:2], prompt)
                    return {
                        "task": "Optical + SAR Cross-Modal Analysis",
                        "specialist": SPECIALIST_NAME,
                        "model": "Gemini (RGB fallback)",
                        "model_connected": True,
                        "answer": answer,
                        "message": "Images are not 12-band optical + 2-band SAR GeoTIFFs. "
                                   "Analyzed by Gemini as fallback.",
                        "confidence": None,
                        "evidence": {"type": "optical_sar_fusion", "method": "gemini_fallback"},
                    }
                except GeminiError as e:
                    pass

            return {
                "task": "Optical + SAR Cross-Modal Analysis",
                "specialist": SPECIALIST_NAME,
                "model": MODEL_SLOT,
                "model_connected": True,
                "answer": None,
                "message": f"Expected 12-band optical + 2-band SAR. "
                           f"Got {optical_bands.shape[0]} and {sar_bands.shape[0]} bands.",
                "confidence": None,
                "evidence": None,
            }

        # Run both models
        s2_probs = _run_model(_s2_model, optical_bands, _s2_mean, _s2_std)
        s1_probs = _run_model(_s1_model, sar_bands, _s1_mean, _s1_std)

        # Fuse results
        fused = _fuse_results(s2_probs, s1_probs, _classes)
        answer = _build_answer(fused)

        # Top fused confidence
        top_conf = fused[0]["fused_confidence"] if fused else None

        # Count agreements/disagreements
        confirmed = sum(1 for r in fused if r["status"] == "CONFIRMED")
        optical_only = sum(1 for r in fused if r["status"] == "OPTICAL_ONLY")
        sar_only = sum(1 for r in fused if r["status"] == "SAR_ONLY")

        return {
            "task": "Optical + SAR Cross-Modal Analysis",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": True,
            "answer": answer,
            "message": (
                f"Cross-modal fusion using BigEarthNet S2 (optical) and S1 (SAR) models. "
                f"{confirmed} classes confirmed by both sensors, "
                f"{optical_only} optical-only, {sar_only} SAR-only detections."
            ),
            "confidence": f"{top_conf*100:.1f}%" if top_conf else None,
            "evidence": {
                "type": "optical_sar_fusion",
                "method": "dual_model",
                "confirmed_classes": confirmed,
                "optical_only_classes": optical_only,
                "sar_only_classes": sar_only,
                "predictions": [r for r in fused if r["fused_confidence"] >= 0.15],
                "all_scores": fused,
            },
        }

    except Exception as e:
        return {
            "task": "Optical + SAR Cross-Modal Analysis",
            "specialist": SPECIALIST_NAME,
            "model": MODEL_SLOT,
            "model_connected": False,
            "answer": None,
            "message": f"Cross-modal analysis failed: {e}",
            "confidence": None,
            "evidence": None,
        }