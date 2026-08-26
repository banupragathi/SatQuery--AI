"""
image_validator.py
==================
Validates uploaded images. Supports standard RGB (PNG/JPG) via Pillow
and multi-band GeoTIFF (12-band Sentinel-2) via tifffile fallback.
"""

import os
from PIL import Image
from io import BytesIO

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
MIN_FILE_SIZE_BYTES = 100


def get_extension(filename: str) -> str:
    return os.path.splitext(filename or "")[1].lower()


def validate_upload(filename: str, raw_bytes: bytes) -> dict:
    result = {
        "ok": False,
        "error": None,
        "extension": get_extension(filename),
        "size_bytes": len(raw_bytes),
        "format": None,
        "width": None,
        "height": None,
    }

    if result["extension"] not in SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_EXTENSIONS))
        result["error"] = f"Unsupported file type '{result['extension']}'. Supported: {supported}."
        return result

    if result["size_bytes"] < MIN_FILE_SIZE_BYTES:
        result["error"] = "File is empty or too small to be a valid image."
        return result
    if result["size_bytes"] > MAX_FILE_SIZE_BYTES:
        mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        result["error"] = f"File is larger than the {mb} MB development limit."
        return result

    # Try Pillow first (works for PNG, JPG, simple TIFFs)
    try:
        with Image.open(BytesIO(raw_bytes)) as img:
            img.verify()
        with Image.open(BytesIO(raw_bytes)) as img:
            result["format"] = img.format
            result["width"], result["height"] = img.size
        result["ok"] = True
        return result
    except Exception:
        pass

    # Pillow failed — try tifffile for multi-band GeoTIFF
    if result["extension"] in (".tif", ".tiff"):
        try:
            import tifffile
            data = tifffile.imread(BytesIO(raw_bytes))
            result["format"] = "TIFF"
            if data.ndim == 3:
                if data.shape[2] <= 12:
                    result["height"], result["width"] = data.shape[0], data.shape[1]
                else:
                    result["height"], result["width"] = data.shape[1], data.shape[2]
            elif data.ndim == 2:
                result["height"], result["width"] = data.shape
            else:
                result["error"] = "Could not determine image dimensions from TIFF."
                return result
            result["ok"] = True
            return result
        except Exception:
            pass

    result["error"] = "The file could not be read as a valid image."
    return result