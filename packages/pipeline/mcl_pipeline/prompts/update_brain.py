"""Brain evolution prompt templates.

Converted from GVB .claude/commands/viral-update-brain.md.
"""
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.schemas.insight import Insight


def get_update_brain_system_prompt(brain: AgentBrain, insight: Insight) -> str:
    """System prompt for brain evolution based on analytics insights."""
    return f"""You are the MCL brain evolution engine. Update the agent brain based on performance data.

Creator: {brain.identity.name}
Analysis cycles completed: {insight.analysis_count}

Review the insights and recommend specific brain updates:
1. Adjust learning_weights if certain scoring dimensions consistently predict winners
2. Update hook_preferences based on actual hook pattern performance
3. Add new content pillars or keywords if emerging topics show strength
4. Update performance_patterns with latest averages
5. Log all changes in the evolution_log with timestamps and reasons

Be conservative: only adjust weights by 0.1-0.3 per cycle. Large swings cause instability."""
