"""Database-driven feature flags using the plans table features JSONB column."""
from supabase import Client

DEFAULT_FEATURES = {
    "advanced_analytics": False,
    "custom_hooks": False,
    "team_seats": False,
    "api_access": True,
    "competitor_intel": False,
    "pdf_export": True,
    "ai_coaching": True,
}


async def get_plan_features(workspace_id: str, supabase: Client) -> dict:
    """Get the feature flags for a workspace based on its plan."""
    result = supabase.table("workspaces").select(
        "plan, subscriptions(plan_id, plans(features))"
    ).eq("id", workspace_id).single().execute()

    if not result.data:
        return dict(DEFAULT_FEATURES)

    # Try to get features from the subscription's plan
    subs = result.data.get("subscriptions")
    if subs and isinstance(subs, dict):
        plans = subs.get("plans")
        if plans and isinstance(plans, dict):
            features = plans.get("features", {})
            return {**DEFAULT_FEATURES, **features}

    # Fallback: derive from plan name
    plan = result.data.get("plan", "free")
    if plan == "agency":
        return {**DEFAULT_FEATURES, "advanced_analytics": True, "custom_hooks": True,
                "team_seats": True, "competitor_intel": True}
    elif plan == "pro":
        return {**DEFAULT_FEATURES, "advanced_analytics": True, "competitor_intel": True}

    return dict(DEFAULT_FEATURES)


async def is_feature_enabled(workspace_id: str, feature: str, supabase: Client) -> bool:
    """Check if a specific feature is enabled for a workspace."""
    features = await get_plan_features(workspace_id, supabase)
    return features.get(feature, False)
