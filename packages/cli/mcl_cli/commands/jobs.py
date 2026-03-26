"""Background job monitoring commands."""
import typer
import httpx
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from mcl_cli.config import get_config

app = typer.Typer(help="Monitor background pipeline jobs.")
console = Console()

# Status color mapping
STATUS_STYLES = {
    "pending": "yellow",
    "running": "bright_cyan",
    "completed": "green",
    "failed": "red",
    "cancelled": "dim",
}


def _get_headers(cfg):
    return {"Authorization": f"Bearer {cfg.api_key}"}


def _require_config(cfg):
    if not cfg.api_key:
        console.print("[red]No API key configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)
    if not cfg.workspace_id:
        console.print("[red]No workspace ID configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)


@app.command("list")
def list_jobs(
    limit: int = typer.Option(10, "--limit", "-n", help="Number of jobs to show"),
    status_filter: str = typer.Option(None, "--status", "-s", help="Filter by status"),
):
    """List recent background jobs."""
    cfg = get_config()
    _require_config(cfg)

    url = f"{cfg.api_url}/api/v1/workspaces/{cfg.workspace_id}/jobs"
    params: dict = {"limit": limit}
    if status_filter:
        params["status"] = status_filter

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=_get_headers(cfg), params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        console.print(f"[red]API error: {exc.response.status_code} - {exc.response.text}[/red]")
        raise typer.Exit(1)
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {cfg.api_url}. Is the server running?[/red]")
        raise typer.Exit(1)

    jobs = data.get("jobs", [])
    if not jobs:
        console.print("[yellow]No jobs found.[/yellow]")
        raise typer.Exit()

    table = Table(title="Jobs", border_style="cyan")
    table.add_column("ID", style="dim", max_width=8)
    table.add_column("Type", style="bold")
    table.add_column("Status", justify="center")
    table.add_column("Progress", justify="center")
    table.add_column("Created", style="dim")
    table.add_column("Duration", style="dim")

    for job in jobs:
        status = job.get("status", "unknown")
        style = STATUS_STYLES.get(status, "white")
        progress = job.get("progress", 0)
        progress_str = f"{progress}%" if isinstance(progress, (int, float)) else str(progress)

        table.add_row(
            str(job.get("id", "-"))[:8],
            job.get("type", "-"),
            f"[{style}]{status}[/{style}]",
            progress_str,
            job.get("created_at", "-"),
            job.get("duration", "-"),
        )

    console.print(table)
    console.print(f"\n[dim]{len(jobs)} jobs shown[/dim]")


@app.command("status")
def job_status(
    job_id: str = typer.Argument(help="Job ID to check"),
):
    """Show detailed status for a specific job."""
    cfg = get_config()
    _require_config(cfg)

    url = f"{cfg.api_url}/api/v1/workspaces/{cfg.workspace_id}/jobs/{job_id}"

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=_get_headers(cfg))
            resp.raise_for_status()
            job = resp.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            console.print(f"[red]Job '{job_id}' not found.[/red]")
        else:
            console.print(f"[red]API error: {exc.response.status_code} - {exc.response.text}[/red]")
        raise typer.Exit(1)
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {cfg.api_url}. Is the server running?[/red]")
        raise typer.Exit(1)

    status = job.get("status", "unknown")
    style = STATUS_STYLES.get(status, "white")
    progress = job.get("progress", 0)

    # Build progress bar
    bar_width = 30
    filled = int(bar_width * progress / 100) if isinstance(progress, (int, float)) else 0
    bar = f"[green]{'=' * filled}[/green][dim]{'.' * (bar_width - filled)}[/dim]"

    console.print(
        Panel(
            f"[bold]Job {job.get('id', job_id)}[/bold]\n\n"
            f"Type:     {job.get('type', '-')}\n"
            f"Status:   [{style}]{status}[/{style}]\n"
            f"Progress: {bar} {progress}%\n"
            f"Created:  {job.get('created_at', '-')}\n"
            f"Started:  {job.get('started_at', '-')}\n"
            f"Duration: {job.get('duration', '-')}",
            title="Job Details",
            border_style="bright_cyan",
        )
    )

    # Steps/log
    steps = job.get("steps", [])
    if steps:
        step_table = Table(title="Steps", border_style="dim")
        step_table.add_column("#", style="dim", width=3)
        step_table.add_column("Step", style="bold")
        step_table.add_column("Status", justify="center")
        step_table.add_column("Duration", style="dim")

        for i, step in enumerate(steps, 1):
            s_status = step.get("status", "pending")
            s_style = STATUS_STYLES.get(s_status, "white")
            step_table.add_row(
                str(i),
                step.get("name", "-"),
                f"[{s_style}]{s_status}[/{s_style}]",
                step.get("duration", "-"),
            )

        console.print(step_table)

    # Error info
    error = job.get("error")
    if error:
        console.print(
            Panel(
                f"[red]{error}[/red]",
                title="Error",
                border_style="red",
            )
        )

    # Result summary
    result = job.get("result")
    if result and status == "completed":
        console.print(
            Panel(
                str(result),
                title="Result",
                border_style="green",
            )
        )
