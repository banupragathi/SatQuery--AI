import json
import logging
from gemini_engine import run_gemini_text
import registry

logger = logging.getLogger("satquery.planner")

import re

def extract_json(res: str):
    content = res.strip()
    
    # Strip explicit markdown fences safely without greedy regex slicing
    if content.startswith("```"):
        content = content.strip("`").strip()
        if content.lower().startswith("json"):
            content = content[4:].strip()

    # Heuristic repair for abrupt LLM JSON cutoff
    if content.endswith(','):
         content = content[:-1]
    # Check if a list was opened but not closed
    if content.startswith('[') and not content.endswith(']'):
         if content.rstrip().endswith('}'):
              content = content.rstrip() + ']'
         elif content.rstrip().endswith(','):
              content = content.rstrip()[:-1] + ']'

    try:
        return json.loads(content)
    except json.JSONDecodeError:
         # Try a fallback if single quotes were used
         import ast
         try:
              return ast.literal_eval(content)
         except Exception:
              pass
         raise

def create_execution_plan(query: str, is_multi_image: bool = False) -> list[dict]:
    capabilities = registry.get_all_capabilities()
    
    spec_descriptions = ""
    for name, meta in capabilities.items():
        spec_descriptions += f"- {name}: {meta['capability']} (Requires Context: {meta['requires_context']}, Output: {meta['output_type']})\n"
        
    prompt = f"""
You are the Orchestrator for SatQuery AI.
Analyze the user's query and decompose it into a sequential Execution Plan.

AVAILABLE SPECIALIST AGENTS:
{spec_descriptions}

RULES:
1. Output ONLY valid JSON array. No conversational text whatsoever.
2. Each element in the array must be an object representing a specialist step: {{"specialist": "NAME", "purpose": "short precise instruction for this step", "depends_on": ["PREV_NAME", ...]}}
3. Understand ALL intents in the query recursively to select ANY required specialists generically. Do not assume a fixed sequence.
4. "depends_on" must contain previously executed specialist names ONLY IF the current specialist requires input/context to function (e.g. a specialist requiring context must depend on previous steps that generate that context).
5. The array must be ordered chronologically (dependencies first).

USER QUERY: "{query}"

Output ONLY JSON format as requested:
"""
    
    try:
        raw_output = run_gemini_text(prompt)
        with open('planner_raw.txt', 'w') as f:
            f.write(raw_output)
            
        plan = extract_json(raw_output)
        
        valid_plan = []
        for task in plan:
            if isinstance(task, dict) and "specialist" in task and task["specialist"] in capabilities:
                if "depends_on" not in task:
                    task["depends_on"] = []
                valid_plan.append(task)
        
        if valid_plan:
            return valid_plan
        else:
            with open('planner_debug.txt', 'a') as dbg:
                dbg.write(f"\nExtracted plan was empty or invalid:\n{plan}\n")
            
            return [{
                "specialist": "ORCHESTRATOR",
                "purpose": "Planner generated an invalid or empty response.",
                "depends_on": []
            }]
            
    except Exception as e:
        import traceback
        with open('planner_debug.txt', 'w') as dbg:
            dbg.write(f"Traceback:\n{traceback.format_exc()}")
        logger.error(f"Planner failed: {e}")
        raise e
        
    raise ValueError("The Orchestrator generated an empty or invalid response sequence and no agents were triggered.")
