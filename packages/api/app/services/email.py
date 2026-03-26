"""Transactional email service using Resend."""
from app.deps import get_settings

SENDER = "Influence Pirates <noreply@influencepirates.com>"


def _get_client():
    import resend
    settings = get_settings()
    resend.api_key = settings.resend_api_key
    return resend


def send_invite(email: str, workspace_name: str, invite_url: str) -> dict:
    """Send workspace invitation email."""
    r = _get_client()
    return r.Emails.send({
        "from": SENDER,
        "to": [email],
        "subject": f"You've been invited to {workspace_name} on Influence Pirates",
        "html": f"""
        <h2>You're invited!</h2>
        <p>You've been invited to join <strong>{workspace_name}</strong> on Influence Pirates.</p>
        <p><a href="{invite_url}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Accept Invitation</a></p>
        """,
    })


def send_welcome(email: str, full_name: str) -> dict:
    """Send post-signup welcome email."""
    r = _get_client()
    return r.Emails.send({
        "from": SENDER,
        "to": [email],
        "subject": "Welcome to Influence Pirates!",
        "html": f"""
        <h2>Welcome, {full_name}!</h2>
        <p>Your account is ready. Start by running the onboarding flow to set up your agent brain.</p>
        <p>The brain learns what works for <em>your</em> audience and gets smarter with every content cycle.</p>
        """,
    })


def send_job_failed(email: str, job_type: str, error: str, workspace_name: str) -> dict:
    """Send failed job notification."""
    r = _get_client()
    return r.Emails.send({
        "from": SENDER,
        "to": [email],
        "subject": f"[Influence Pirates] {job_type} job failed in {workspace_name}",
        "html": f"""
        <h2>Job Failed</h2>
        <p>A <strong>{job_type}</strong> job in <strong>{workspace_name}</strong> failed:</p>
        <pre style="background:#f3f4f6;padding:12px;border-radius:6px;">{error}</pre>
        <p>The job will be automatically retried. Check the dashboard for details.</p>
        """,
    })


def send_connection_expired(email: str, platform: str, workspace_name: str) -> dict:
    """Send expired platform connection alert."""
    r = _get_client()
    return r.Emails.send({
        "from": SENDER,
        "to": [email],
        "subject": f"[Influence Pirates] {platform} connection expired in {workspace_name}",
        "html": f"""
        <h2>Connection Expired</h2>
        <p>Your <strong>{platform}</strong> connection in <strong>{workspace_name}</strong> has expired.</p>
        <p>Reconnect it in Settings to continue using {platform} features.</p>
        """,
    })
