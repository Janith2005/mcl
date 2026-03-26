"""Stripe webhook handler."""
from fastapi import APIRouter, Request, HTTPException
import stripe
import structlog

from app.config import Settings
from app.deps import get_supabase

logger = structlog.get_logger(__name__)
settings = Settings()

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle inbound Stripe webhook events.

    No auth required -- verification is done via Stripe signature.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        logger.warning("stripe_webhook_missing_signature")
        raise HTTPException(status_code=400, detail="Missing Stripe signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.stripe_webhook_secret,
        )
    except stripe.error.SignatureVerificationError as exc:
        logger.warning("stripe_webhook_signature_failed", error=str(exc))
        raise HTTPException(status_code=400, detail="Invalid signature")
    except ValueError as exc:
        logger.warning("stripe_webhook_invalid_payload", error=str(exc))
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event["type"]
    data_object = event["data"]["object"]
    logger.info("stripe_webhook_received", event_type=event_type, event_id=event["id"])

    supabase = get_supabase()

    try:
        if event_type == "customer.subscription.created":
            await _handle_subscription_created(supabase, data_object)
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(supabase, data_object)
        elif event_type == "invoice.payment_failed":
            await _handle_payment_failed(supabase, data_object)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(supabase, data_object)
        else:
            logger.info("stripe_webhook_unhandled_event", event_type=event_type)
    except Exception as exc:
        logger.error("stripe_webhook_handler_error", event_type=event_type, error=str(exc))
        raise

    return {"status": "ok"}


async def _handle_subscription_created(supabase, subscription: dict):
    """Create or update a subscription record on customer.subscription.created."""
    logger.info(
        "stripe_subscription_created",
        subscription_id=subscription["id"],
        customer=subscription["customer"],
    )
    supabase.table("subscriptions").upsert({
        "stripe_subscription_id": subscription["id"],
        "stripe_customer_id": subscription["customer"],
        "status": subscription["status"],
        "current_period_start": subscription["current_period_start"],
        "current_period_end": subscription["current_period_end"],
        "plan_id": subscription["items"]["data"][0]["price"]["id"] if subscription.get("items") else None,
    }).execute()


async def _handle_subscription_updated(supabase, subscription: dict):
    """Sync subscription status and period dates on customer.subscription.updated."""
    logger.info(
        "stripe_subscription_updated",
        subscription_id=subscription["id"],
        status=subscription["status"],
    )
    supabase.table("subscriptions").update({
        "status": subscription["status"],
        "current_period_start": subscription["current_period_start"],
        "current_period_end": subscription["current_period_end"],
    }).eq("stripe_subscription_id", subscription["id"]).execute()


async def _handle_payment_failed(supabase, invoice: dict):
    """Set subscription status to 'past_due' on invoice.payment_failed."""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        logger.warning("stripe_payment_failed_no_subscription", invoice_id=invoice["id"])
        return

    logger.info(
        "stripe_payment_failed",
        subscription_id=subscription_id,
        invoice_id=invoice["id"],
    )
    supabase.table("subscriptions").update({
        "status": "past_due",
    }).eq("stripe_subscription_id", subscription_id).execute()


async def _handle_subscription_deleted(supabase, subscription: dict):
    """Set subscription status to 'canceled' on customer.subscription.deleted."""
    logger.info(
        "stripe_subscription_deleted",
        subscription_id=subscription["id"],
    )
    supabase.table("subscriptions").update({
        "status": "canceled",
    }).eq("stripe_subscription_id", subscription["id"]).execute()
