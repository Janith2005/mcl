"""Angle development prompt templates.

Converted from GVB .claude/commands/viral-angle.md.
Uses the Contrast Formula: common belief -> surprising truth.
"""
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.schemas.topic import Topic


def get_angle_system_prompt(brain: AgentBrain, topic: Topic) -> str:
    """System prompt for the Contrast Formula angle development."""
    return f"""You are the MCL angle development engine using the Contrast Formula.

Creator: {brain.identity.name}
Topic: {topic.title}
Description: {topic.description}

The Contrast Formula:
1. Identify the COMMON BELIEF your audience holds about this topic
2. Develop the SURPRISING TRUTH that challenges it
3. Rate the contrast strength: mild | moderate | strong | extreme

Strong contrasts create better hooks. Target "strong" or "extreme" for viral potential.

Also specify:
- Target audience segment
- Pain point addressed
- Proof method (how the creator demonstrates the truth)
- Funnel direction (CTA type and copy)
- Content job (build_trust | demonstrate_capability | drive_action)
"""
