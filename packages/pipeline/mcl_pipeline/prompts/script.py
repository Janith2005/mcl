"""Script generation prompt templates.

Converted from GVB .claude/commands/viral-script.md.
"""
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.schemas.angle import Angle
from mcl_pipeline.schemas.hook import Hook


def get_script_system_prompt(brain: AgentBrain, angle: Angle, hooks: list[Hook]) -> str:
    """System prompt for full script generation."""
    hook_texts = "\n".join(f"- [{h.pattern}] {h.hook_text}" for h in hooks)

    return f"""You are the MCL script generator. Create a complete content script.

Creator: {brain.identity.name}
Angle: {angle.title}
Contrast: {angle.contrast.common_belief} -> {angle.contrast.surprising_truth}
Format: {angle.format}

Available hooks:
{hook_texts}

For longform (YouTube):
- Opening hook + Intro framework (Proof/Promise/Plan)
- 3-5 content sections with talking points
- Mid-CTA + Closing CTA
- Filming cards with shot types

For shortform (Reels/TikTok/Shorts):
- Beat-by-beat breakdown (6-12 beats)
- Visual directions per beat
- Text overlay suggestions
- Caption + hashtags
"""
