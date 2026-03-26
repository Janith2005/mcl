"""Onboarding prompt templates.

Converted from GVB .claude/commands/viral-onboard.md.
The template provides the AI coaching prompts for the 9-section onboarding flow.
"""
from mcl_pipeline.schemas.brain import AgentBrain

SECTIONS = [
    "identity", "icp", "pillars", "platforms", "competitors",
    "cadence", "monetization", "audience_blockers", "content_jobs",
]


def get_onboard_system_prompt() -> str:
    """System prompt for the onboarding AI coach."""
    return """You are running the MCL onboarding flow. Your job is to have a conversational coaching session to populate the user's agent brain -- the central memory that every module reads from.

Walk through 9 sections conversationally. Ask 1-2 sections at a time, then pause for the user to respond. Do NOT dump all questions at once. Synthesize their free-text answers into structured fields.

Sections:
1. Identity (name, brand, niche, tone, differentiator)
2. ICP (segments, pain_points, goals, platforms_they_use, budget_range)
3. Content Pillars (name, description, keywords per pillar)
4. Platforms (research platforms, posting platforms)
5. Competitors (name, platform, handle, why_watch)
6. Cadence (shorts_per_day, shorts_days, longform_per_week, longform_days)
7. Monetization (primary_funnel, secondary_funnels, cta_strategy, client_capture)
8. Audience Blockers (lie, destruction, pillar)
9. Content Jobs (build_trust, demonstrate_capability, drive_action pillar mapping)
"""


def get_brain_summary_prompt(brain: AgentBrain) -> str:
    """Generate a summary of the current brain state."""
    pillars = ", ".join(p.name for p in brain.pillars)
    posting = ", ".join(brain.platforms.posting)
    segments = ", ".join(brain.icp.segments)

    return f"""Here's what I have for you currently:

Name: {brain.identity.name} ({brain.identity.brand})
Niche: {brain.identity.niche}
Pillars: {pillars}
Posting on: {posting}
ICP: {segments}
Monetization: {brain.monetization.primary_funnel}

Want to update specific sections, or start completely fresh?"""


def get_section_prompts() -> dict[str, str]:
    """Return the opening context prompts for each section."""
    return {
        "identity": "Let's start with who you are and what you're building. This helps me match your voice and brand in everything I generate.",
        "icp": "Now let's define who your content is actually for. The more specific you are here, the better I can score topics and tailor angles to your audience.",
        "pillars": "Content pillars are the 3-5 recurring themes that everything you create maps back to. They keep you focused and make your content recognizable.",
        "platforms": "Let's figure out where to look for trends and where you actually post. These can be different.",
        "competitors": "Who in your space is worth watching? These are creators whose content strategy you can learn from.",
        "cadence": "How often do you want to post? Consistency matters more than volume.",
        "monetization": "Every piece of content should serve a funnel. Let's map out how your content connects to revenue.",
        "audience_blockers": "What lies or excuses does your audience believe that hold them back? These are the false beliefs your content exists to destroy.",
        "content_jobs": "Each content pillar has a primary job -- building trust, demonstrating capability, or driving action.",
    }
