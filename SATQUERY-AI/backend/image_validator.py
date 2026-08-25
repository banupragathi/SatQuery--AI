"""
image_validator.py
==================

Basic, honest validation of an uploaded image before we try to analyse it.

What we check now:
    - the file has a supported extension
    - the file is not empty and not unreasonably large
    - the bytes actually open as a real image (via Pillow)
    - we read back the real dimensions and format

What we deliberately do NOT do yet:
    - geospatial / GeoTIFF-specific validation (coordinate systems, bands,
      projections). That belongs to a later phase. We accept .tif/.tiff at
      the file level here, and Pillow can read many single-band/RGB TIFFs
      for basic metadata.
"""

import os
from PIL import Image

# File extensions we accept at upload time.
SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}

# Reasonable development limits.
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024   # 50 MB
MIN_FILE_SIZE_BYTES = 100                # anything smaller isn't a real image


def get_extension(filename: str) -> str:
    """Return the lowercase extension of a filename, including the dot."""
    return os.path.splitext(filename or "")[1].lower()


def validate_upload(filename: str, raw_bytes: bytes) -> dict:
    """
    Validate an uploaded image's filename and raw bytes.

    Parameters
    ----------
    filename : str
        The original filename from the client.
    raw_bytes : bytes
        The full contents of the uploaded file.

    Returns
    -------
    dict
        {
            "ok": bool,
            "error": str | None,        # a plain message when ok is False
            "extension": str,
            "size_bytes": int,
            "format": str | None,       # e.g. "PNG", "TIFF" (when readable)
            "width": int | None,
            "height": int | None,
        }

    This function never raises for expected problems; it returns ok=False
    with a clear 'error' message so the API can turn it into a clean 400.
    """
    result = {
        "ok": False,
        "error": None,
        "extension": get_extension(filename),
        "size_bytes": len(raw_bytes),
        "format": None,
        "width": None,
        "height": None,
    }

    # 1. Extension check
    if result["extension"] not in SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_EXTENSIONS))
        result["error"] = f"Unsupported file type '{result['extension']}'. Supported: {supported}."
        return result

    # 2. Size checks
    if result["size_bytes"] < MIN_FILE_SIZE_BYTES:
        result["error"] = "File is empty or too small to be a valid image."
        return result
    if result["size_bytes"] > MAX_FILE_SIZE_BYTES:
        mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        result["error"] = f"File is larger than the {mb} MB development limit."
        return result

    # 3. Readability check + real dimensions, using Pillow.
    #    We write to a temporary buffer via BytesIO so we do not need the file
    #    on disk yet.
    from io import BytesIO
    try:
        with Image.open(BytesIO(raw_bytes)) as img:
            img.verify()  # confirms the file is not corrupt
        # verify() leaves the image unusable, so reopen to read size/format.
        with Image.open(BytesIO(raw_bytes)) as img:
            result["format"] = img.format
            result["width"], result["height"] = img.size
    except Exception:
        result["error"] = "The file could not be read as a valid image."
        return result

    result["ok"] = True
    return result
