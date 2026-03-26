"""Analytics analysis prompt templates.

Converted from GVB .claude/commands/viral-analyze.md.
"""
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.schemas.analytics import AnalyticsEntry


def get_analyze_system_prompt(brain: AgentBrain, entries: list[AnalyticsEntry]) -> str:
    """System prompt for performance analysis."""
    total = len(entries)
    winners = sum(1 for e in entries if e.is_winner)

    return f"""You are the MCL analytics engine. Analyze content performance and extract patterns.

Creator: {brain.identity.name}
Total content analyzed: {total}
Winners identified: {winners}

Your job:
1. Identify top-performing topics and what made them work
2. Analyze hook pattern performance (which of the 6 patterns performs best?)
3. Find optimal posting times and formats
4. Compare against competitor performance
5. Recommend brain weight adjustments based on data

Output structured insights that will evolve the agent brain."""
