"""
manager.py
==========

The Manager is the "brain" that decides WHAT KIND of analysis a user's
question needs. It does not run any AI model itself. Its only job is to
read the natural-language query and return a short TASK label, such as
"VQA", "CAPTION", or "GROUNDING".

Why keep it this simple?
------------------------
The Manager deliberately knows nothing about which specialists exist or
how they work. It only produces a task label (a plain string). The
registry (registry.py) is the single place that maps a task label to the
function that handles it. This separation is what lets us add new
specialists later (CHANGE, OPTICAL_SAR) WITHOUT rewriting the Manager.

Right now routing is simple keyword matching. That is intentional. A big
agent framework (LangChain / LangGraph) would be overkill here and would
hide what is actually happening. Later, if routing needs to get smarter,
this one function is the only thing that changes.
"""

# Keywords that signal the user wants a region located / boxed on the image.
GROUNDING_KEYWORDS = (
    "highlight",
    "locate",
    "where is",
    "where are",
    "point to",
    "point out",
    "mark the",
    "show me the location",
    "find the",
    "outline",
)

# Keywords that signal the user wants a description / caption of the whole
# scene, rather than an answer to a specific question.
CAPTION_KEYWORDS = (
    "describe",
    "description",
    "caption",
    "summarize",
    "summary",
    "overview",
    "what does this image show",
    "what is in this image",
    "scene",
)


def route(query: str) -> dict:
    """
    Decide which task a query belongs to.

    Parameters
    ----------
    query : str
        The user's natural-language question, e.g. "Is there a water body?"

    Returns
    -------
    dict
        {
            "task": "VQA" | "CAPTION" | "GROUNDING",
            "routing_reason": "<plain-English explanation>",
            "matched_keyword": "<the keyword that matched, or None>"
        }

    We return a small dict (not just the string) so the frontend can show a
    transparent "why did it choose this?" line in the execution trace. It is
    still simple to use: callers just read result["task"].
    """
    text = (query or "").strip().lower()

    if not text:
        return {
            "task": "VQA",
            "routing_reason": "Empty query defaulted to Visual Question Answering.",
            "matched_keyword": None,
        }

    # Grounding is the most specific intent ("locate / highlight / where is"),
    # so we check it FIRST, before captioning or the VQA default.
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

    for keyword in CAPTION_KEYWORDS:
        if keyword in text:
            return {
                "task": "CAPTION",
                "routing_reason": (
                    f"Query contains '{keyword}', which asks for a description "
                    f"of the scene rather than a specific answer."
                ),
                "matched_keyword": keyword,
            }

    # Default: any direct question ("Is there...?", "Are there...?", "How many...?")
    # is treated as Visual Question Answering.
    return {
        "task": "VQA",
        "routing_reason": (
            "Query reads as a direct question about the image, so it was "
            "routed to Visual Question Answering."
        ),
        "matched_keyword": None,
    }