"""
manager.py — Query router with natural-language keyword matching
Routes user queries to the right specialist. Checks in order:
LAND_COVER → CHANGE → GROUNDING → CAPTION → VQA (default)
"""

OPTICAL_SAR_KEYWORDS = (
    "optical and sar", "sar and optical",
    "both sensors", "both images together",
    "combine", "cross-modal", "cross modal",
    "fusion", "complementary",
    "radar and optical", "optical and radar",
    "multi-sensor", "multisensor",
)

SAR_KEYWORDS = (
    "sar image", "sar data", "sar analysis",
    "radar image", "radar data",
    "sentinel-1", "sentinel 1",
    "synthetic aperture",
)

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

CHANGE_KEYWORDS = (
    "change", "changed", "changes",
    "different", "difference", "differences",
    "before and after", "compare these",
    "what happened", "what has happened",
    "increased", "decreased",
    "expanded", "shrunk", "grown",
    "new construction", "deforestation",
    "between these two", "between the two",
    "over time", "temporal", "bitemporal", "bi-temporal",
    "earlier", "later",
    "evolution", "progression",
)

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
    text = (query or "").strip().lower()

    if not text:
        return {
            "task": "VQA",
            "routing_reason": "Empty query defaulted to Visual Question Answering.",
            "matched_keyword": None,
        }

    for keyword in LAND_COVER_KEYWORDS:
        if keyword in text:
            return {
                "task": "LAND_COVER",
                "routing_reason": f"Query contains '{keyword}', routed to BigEarthNet specialist.",
                "matched_keyword": keyword,
            }
        
    for keyword in OPTICAL_SAR_KEYWORDS:
        if keyword in text:
            return {
                "task": "OPTICAL_SAR",
                "routing_reason": f"Query contains '{keyword}', routed to cross-modal analysis.",
                "matched_keyword": keyword,
            }

    for keyword in SAR_KEYWORDS:
        if keyword in text:
            return {
                "task": "LAND_COVER",
                "routing_reason": f"Query contains '{keyword}', routed to land-cover specialist (SAR mode).",
                "matched_keyword": keyword,
            }

    for keyword in CHANGE_KEYWORDS:
        if keyword in text:
            return {
                "task": "CHANGE",
                "routing_reason": f"Query contains '{keyword}', routed to change analysis.",
                "matched_keyword": keyword,
            }

    for keyword in GROUNDING_KEYWORDS:
        if keyword in text:
            return {
                "task": "GROUNDING",
                "routing_reason": f"Query contains '{keyword}', routed to grounding.",
                "matched_keyword": keyword,
            }

    for keyword in CAPTION_KEYWORDS:
        if keyword in text:
            return {
                "task": "CAPTION",
                "routing_reason": f"Query contains '{keyword}', routed to captioning.",
                "matched_keyword": keyword,
            }

    return {
        "task": "VQA",
        "routing_reason": "Query reads as a direct question, routed to VQA.",
        "matched_keyword": None,
    }