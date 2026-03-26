"""Re-score existing topics when learning weights change.

Ported from GVB scoring/rescore.py. Key change: accepts AgentBrain model
instead of reading from filesystem. Operates on in-memory topic lists
instead of JSONL files.
"""
from __future__ import annotations

import re
from typing import List, Dict

from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.scoring.engine import (
    build_brain_context,
    score_icp_relevance,
    score_content_gap,
    score_proof_potential,
    apply_competitor_bonuses,
    calculate_weighted_total,
)


def _extract_views(engagement_str: str) -> int:
    """Extract numeric view count from engagement signals string.

    Ported from GVB scoring/rescore.py.
    """
    # Match patterns like "504,167 views" or "100K views"
    match = re.search(r"([\d,]+)\s*views", engagement_str)
    if match:
        return int(match.group(1).replace(",", ""))

    match = re.search(r"(\d+)K\s*views", engagement_str, re.IGNORECASE)
    if match:
        return int(match.group(1)) * 1000

    return 0


def rescore_topics(
    topics: List[Dict],
    brain: AgentBrain,
) -> Dict:
    """Re-score all topics using current brain weights.

    Args:
        topics: List of topic dicts (must have 'scoring', 'title', 'description' keys)
        brain: Current AgentBrain with updated learning_weights

    Returns:
        Summary dict with old_avg, new_avg, biggest_change, rescored_count
    """
    if not topics:
        return {
            "rescored_count": 0,
            "old_avg": 0.0,
            "new_avg": 0.0,
            "biggest_change": 0.0,
            "biggest_change_id": "",
        }

    brain_ctx = build_brain_context(brain)
    weights = brain_ctx["learning_weights"]

    old_avg = sum(t["scoring"]["weighted_total"] for t in topics) / len(topics)
    biggest_change = 0.0
    biggest_change_id = ""

    for topic in topics:
        old_wt = topic["scoring"]["weighted_total"]
        text = f"{topic.get('title', '')} {topic.get('description', '')}"
        is_competitor = topic.get("source", {}).get("platform") == "competitor_analysis"

        if is_competitor:
            # Re-run full scoring for competitor topics
            views_str = topic.get("source", {}).get("engagement_signals", "0")
            views = _extract_views(views_str)

            scores = {
                "icp_relevance": score_icp_relevance(text, brain_ctx),
                "timeliness": topic["scoring"].get("timeliness", 6),
                "content_gap": score_content_gap(text, brain_ctx),
                "proof_potential": score_proof_potential(text),
            }
            scores = apply_competitor_bonuses(scores, views)
            scores["total"] = sum(
                scores[k]
                for k in ["icp_relevance", "timeliness", "content_gap", "proof_potential"]
            )
            scores["weighted_total"] = calculate_weighted_total(scores, weights)
            topic["scoring"] = scores
        else:
            # For non-competitor topics, just recalculate weighted_total with new weights
            new_wt = calculate_weighted_total(topic["scoring"], weights)
            topic["scoring"]["weighted_total"] = new_wt

        change = abs(topic["scoring"]["weighted_total"] - old_wt)
        if change > biggest_change:
            biggest_change = change
            biggest_change_id = topic.get("id", "unknown")

    new_avg = sum(t["scoring"]["weighted_total"] for t in topics) / len(topics)

    return {
        "rescored_count": len(topics),
        "old_avg": round(old_avg, 1),
        "new_avg": round(new_avg, 1),
        "biggest_change": round(biggest_change, 1),
        "biggest_change_id": biggest_change_id,
    }
