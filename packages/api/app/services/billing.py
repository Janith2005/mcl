"""Stripe billing integration service.

Provides helpers for creating checkout sessions, billing portal URLs,
and syncing subscription status from Stripe.
"""
import stripe
import structlog
from supabase import Client

logger = structlog.get_logger(__name__)


async def create_checkout_session(
    workspace_id: str,
    plan_id: str,
    supabase: Client,
    stripe_client: stripe,
) -> dict:
    """Create a Stripe Checkout Session for the given workspace + plan.

    Returns a dict with ``session_id`` and ``url`` that the frontend can
    redirect the user to.
    """
    # Look up the workspace for customer mapping
    ws = (
        supabase.table("workspaces")
        .select("id, owner_id, name")
        .eq("id", workspace_id)
        .single()
        .execute()
    )
    if not ws.data:
        raise ValueError(f"Workspace {workspace_id} not found")

    # Look up plan's Stripe price ID
    plan = (
        supabase.table("plans")
        .select("stripe_price_id_monthly, display_name")
        .eq("id", plan_id)
        .single()
        .execute()
    )
    if not plan.data or not plan.data.get("stripe_price_id_monthly"):
        raise ValueError(f"Plan {plan_id} not found or has no Stripe price configured")

    # Check if workspace already has a Stripe customer
    sub = (
        supabase.table("subscriptions")
        .select("stripe_customer_id")
        .eq("workspace_id", workspace_id)
        .limit(1)
        .execute()
    )
    customer_id = sub.data[0]["stripe_customer_id"] if sub.data else None

    session_params: dict = {
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [
            {
                "price": plan.data["stripe_price_id_monthly"],
                "quantity": 1,
            }
        ],
        "success_url": f"https://app.influencepirates.com/settings?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": "https://app.influencepirates.com/settings?checkout=cancel",
        "metadata": {
            "workspace_id": workspace_id,
        },
    }

    if customer_id:
        session_params["customer"] = customer_id

    session = stripe_client.checkout.Session.create(**session_params)

    logger.info(
        "stripe_checkout_session_created",
        workspace_id=workspace_id,
        session_id=session.id,
    )

    return {"session_id": session.id, "url": session.url}


async def get_billing_portal_url(
    workspace_id: str,
    supabase: Client,
    stripe_client: stripe,
) -> str:
    """Create a Stripe Billing Portal session URL for self-serve management.

    Raises ValueError if the workspace has no Stripe customer.
    """
    sub = (
        supabase.table("subscriptions")
        .select("stripe_customer_id")
        .eq("workspace_id", workspace_id)
        .single()
        .execute()
    )

    if not sub.data or not sub.data.get("stripe_customer_id"):
        raise ValueError("No billing account found for this workspace")

    session = stripe_client.billing_portal.Session.create(
        customer=sub.data["stripe_customer_id"],
        return_url="https://app.influencepirates.com/settings",
    )

    logger.info(
        "stripe_portal_session_created",
        workspace_id=workspace_id,
    )

    return session.url


async def sync_subscription_status(
    workspace_id: str,
    supabase: Client,
) -> dict:
    """Read the current subscription status for a workspace from the database.

    Returns the subscription record or an empty dict if none exists.
    This is a read-only helper -- actual Stripe sync happens via webhooks.
    """
    result = (
        supabase.table("subscriptions")
        .select("*, plans(name, display_name, features)")
        .eq("workspace_id", workspace_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        return {
            "workspace_id": workspace_id,
            "status": "free",
            "plan": "free",
        }

    subscription = result.data[0]
    plan_info = subscription.get("plans", {})

    return {
        "workspace_id": workspace_id,
        "status": subscription.get("status", "unknown"),
        "plan": plan_info.get("name", "unknown") if isinstance(plan_info, dict) else "unknown",
        "plan_display_name": plan_info.get("display_name", "") if isinstance(plan_info, dict) else "",
        "current_period_start": subscription.get("current_period_start"),
        "current_period_end": subscription.get("current_period_end"),
        "cancel_at": subscription.get("cancel_at"),
        "trial_end": subscription.get("trial_end"),
    }
