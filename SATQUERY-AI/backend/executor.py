import logging
import registry
import traceback
from gemini_engine import run_gemini_text

logger = logging.getLogger("satquery.executor")

def _should_skip(spec_name: str, step: dict, lookup: dict, query: str) -> tuple[bool, str]:
    meta = registry.get_specialist_metadata(spec_name)
    if meta and meta.get("requires_context") and step.get("depends_on"):
        deps_answers = []
        for dep in step["depends_on"]:
            if dep in lookup and lookup[dep].get("status") == "completed" and lookup[dep].get("answer"):
                deps_answers.append(lookup[dep]["answer"])
                
        if deps_answers:
            prev_context = " ".join(deps_answers)
            eval_prompt = f"""
            Based ONLY on the previous analysis:
            "{prev_context}"
            
            Does this analysis explicitly state or imply that the visual feature/object requested in the query ("{query}") is NOT present, NOT visible, or does NOT exist?
            
            Answer YES (it is NOT present) or NO (it is present or might be).
            """
            try:
                res = run_gemini_text(eval_prompt).strip().upper()
                if res.startswith("YES"):
                    return True, "Requested feature was not detected"
            except Exception as e:
                logger.error(f"Failed to evaluate skip condition during multi-agent context linking: {e}")
                return False, ""
    return False, ""

def execute_plan(plan: list[dict], image_paths: list[str], query: str) -> dict:
    results = []
    visual_results = []
    lookup = {}
    
    for step in plan:
        spec_name = step["specialist"]
        spec_func = registry.get_specialist(spec_name)
        
        if not spec_func:
            logger.warning(f"Specialist {spec_name} not found in registry.")
            results.append({
                "specialist": spec_name,
                "status": "failed",
                "answer": f"Specialist {spec_name} is not available.",
                "confidence": None,
                "model": "Unknown"
            })
            continue
            
        skip, skip_reason = _should_skip(spec_name, step, lookup, query)
        if skip:
            skip_res = {
                "specialist": spec_name,
                "status": "skipped",
                "answer": None,
                "reason": skip_reason,
                "confidence": None,
                "model": None
            }
            results.append(skip_res)
            lookup[spec_name] = skip_res
            continue
            
        enhanced_query = f"Original Query: {query}\n\nYour SPECIFIC task for this step: {step['purpose']}. Focus ONLY on this specific task, do not answer other implied tasks."
        if step.get("depends_on"):
            dep_ctx = []
            for dep in step["depends_on"]:
                if dep in lookup and lookup[dep].get("answer"):
                    dep_ctx.append(f"[{dep} found: {lookup[dep]['answer']}]")
            if dep_ctx:
                enhanced_query += f"\n\nContext from previous steps:\n" + "\n".join(dep_ctx) + "\nUse this context to complete your specific task."
                
        try:
            if registry.is_multi_image_task(spec_name):
                args = (image_paths, enhanced_query)
            else:
                args = (image_paths[0], enhanced_query)
            
            res = spec_func(*args)
            
            # If the specialist returned a network error or missing answer natively, track it as failed so the frontend sees it!
            if res.get("model_connected") is False or not res.get("answer"):
                agent_status = "failed"
                agent_answer = res.get("message", "Model call failed or returned empty.")
            else:
                agent_status = "completed"
                agent_answer = res.get("answer")
                
            cleaned_res = {
                "specialist": spec_name,
                "status": agent_status,
                "answer": agent_answer,
                "confidence": res.get("confidence"),
                "model": res.get("model", "Gemini"),
                "task": res.get("task", spec_name)
            }
            
            lookup[spec_name] = cleaned_res
            
            if "evidence" in res and res["evidence"]:
                visual_results.append({
                    "specialist": spec_name,
                    "evidence": res["evidence"]
                })
            results.append(cleaned_res)
        except Exception as e:
            logger.error(f"Specialist {spec_name} failed: {e}")
            logger.error(traceback.format_exc())
            results.append({
                "specialist": spec_name,
                "status": "failed",
                "answer": "Failed to execute branch gracefully.",
                "confidence": None,
                "model": None
            })
            
    return _aggregate_results(query, plan, results, visual_results)

def _aggregate_results(query, plan, results, visual_results):
    final_answer_parts = []
    executed_specialists = []
    executed_models = []
    primary_task = "MULTI-AGENT ANALYSIS"
    
    for r in results:
        model_raw = r.get("model")
        if model_raw:
            model_clean = "Gemini" if "Gemini" in model_raw else ("ResNet-18 / PyTorch" if "ResNet" in model_raw else model_raw)
        else:
            model_clean = None
            
        if r.get("status") == "completed":
            executed_specialists.append(r["specialist"])
            primary_task = r.get("task", primary_task)
            if model_clean and model_clean not in executed_models:
                executed_models.append(model_clean)
                
            ans = r.get("answer")
            if ans:
                if len(plan) > 1:
                    final_answer_parts.append(f"{r['specialist']}:\n{ans}")
                else:
                    final_answer_parts.append(ans)
                    
        elif r.get("status") == "skipped":
            if len(plan) > 1:
                final_answer_parts.append(f"{r['specialist']}:\nSkipped. {r.get('reason')}")
        
        elif r.get("status") == "failed":
            if len(plan) > 1:
                final_answer_parts.append(f"{r['specialist']}:\nFailed: {r.get('answer', 'Unknown error.')}")
            else:
                final_answer_parts.append(f"Failed: {r.get('answer', 'Unknown error.')}")
            
    final_answer = "\n\n".join(final_answer_parts)
    if not final_answer:
        final_answer = "Analysis failed to execute."
        
    execution_trace = []
    for step in plan:
        spec_name = step["specialist"]
        status = "failed"
        detail = step["purpose"]
        for r in results:
            if r["specialist"] == spec_name:
                status = r["status"]
                if status == "skipped":
                    detail = f"Reason: {r.get('reason')}"
                break
        execution_trace.append({
            "step": f"Agent {spec_name}",
            "detail": f"({status.upper()}) {detail}"
        })
        
    highest_confidence = next((r.get("confidence") for reversed_r in reversed(results) for r in [reversed_r] if r.get("confidence")), None)
    best_evidence = next((v.get("evidence") for reversed_v in reversed(visual_results) for v in [reversed_v]), None)
    
    # If it's a multi-agent plan, force the overarching task label
    if len(plan) > 1:
        primary_task = "MULTI-AGENT ANALYSIS"
    elif len(plan) == 1 and executed_specialists:
        # It maintains its native task title mapped internally by the specialist script
        pass
    else:
        primary_task = "UNKNOWN"
    
    return {
        "status": "completed",
        "query": query,
        "execution_plan": plan,
        "agent_results": results,
        "visual_results": visual_results,
        "final_answer": final_answer,
        "answer": final_answer,
        "task": primary_task,
        "specialist": " + ".join(executed_specialists) if executed_specialists else "",
        "model": " + ".join(executed_models) if executed_models else "",
        "confidence": highest_confidence,
        "evidence": best_evidence,
        "execution_trace": execution_trace,
        "model_connected": True
    }
