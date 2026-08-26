"""
manager.py — Query router with natural-language keyword matching
================================================================
Routes user queries to the right specialist. Uses broad keyword lists
plus fallback patterns so natural phrasing works, not just exact words.

Priority order: LAND_COVER → GROUNDING → CAPTION → VQA (default)
"""

# Land-cover / classification intent
LAND_COVER_KEYWORDS = (
    "land cover", "land use", "land-cover", "land-use",
    "classify", "classification",
    "what type of land", "what kind of land",
    "forest or urban", "forest or agriculture",
    "vegetation type", "crop type",
    "is this mainly", "is this mostly",
    "is this urban", "is this forest", "is this agricultural",
    "land class", "terrain type",
)

# Grounding intent — user wants something LOCATED / POINTED AT on the image
GROUNDING_KEYWORDS = (
    "highlight", "locate", "localize",
    "where is", "where are", "where can i see",
    "point to", "point out", "point at",
    "mark the", "mark out",
    "show me the location", "show me where",
    "show the", "show me the",
    "find the", "find where",
    "outline", "outline the",
    "draw a box", "bounding box",
    "identify the location", "identify where",
    "circle the", "indicate the",
    "which part", "which area", "which region",
    "pin the", "pinpoint",
)

# Captioning intent — user wants a DESCRIPTION of the whole scene
CAPTION_KEYWORDS = (
    "describe", "description",
    "caption", "captioning",
    "summarize", "summary", "summarise",
    "overview", "give me an overview",
    "what does this image show", "what does the image show",
    "what is in this image", "what's in this image",
    "what do you see", "what can you see",
    "tell me about this image", "tell me about the image",
    "tell me what you see",
    "what does this mean", "what does the image mean",
    "explain this image", "explain the image",
    "what is this image", "what's this image",
    "scene", "scene description",
    "what is visible", "what's visible",
    "what is shown", "what's shown",
    "list the features", "list everything",
    "what all is there", "what all can you see",
    "brief me", "give me details",
    "analyze this", "analyse this",
    "interpret this",
)


def route(query: str) -> dict:
    """
    Decide which task a query belongs to.

    Returns dict with task, routing_reason, matched_keyword.
    Checks in order: LAND_COVER → GROUNDING → CAPTION → VQA default.
    """
    text = (query or "").strip().lower()

    if not text:
        return {
            "task": "VQA",
            "routing_reason": "Empty query defaulted to Visual Question Answering.",
            "matched_keyword": None,
        }

    # 1. Land-cover (most domain-specific)
    for keyword in LAND_COVER_KEYWORDS:
        if keyword in text:
            return {
                "task": "LAND_COVER",
                "routing_reason": (
                    f"Query contains '{keyword}', which asks about land-cover "
                    f"type, so it was routed to the BigEarthNet specialist."
                ),
                "matched_keyword": keyword,
            }

    # 2. Grounding (user wants location/box)
    for keyword in GROUNDING_KEYWORDS:
        if keyword in text:
            return {
                "task": "GROUNDING",
                "routing_reason": (
                    f"Query contains '{keyword}', which asks to locate a "
                    f"specific region, so it was routed to grounding."
                ),
                "matched_keyword": keyword,
            }

    # 3. Captioning (user wants a description of the whole scene)
    for keyword in CAPTION_KEYWORDS:
        if keyword in text:
            return {
                "task": "CAPTION",
                "routing_reason": (
                    f"Query contains '{keyword}', which asks for a description "
                    f"of the scene, so it was routed to captioning."
                ),
                "matched_keyword": keyword,
            }

    # 4. Default: VQA (any direct question about the image)
    return {
        "task": "VQA",
        "routing_reason": (
            "Query reads as a direct question about the image, so it was "
            "routed to Visual Question Answering."
        ),
        "matched_keyword": None,
    }