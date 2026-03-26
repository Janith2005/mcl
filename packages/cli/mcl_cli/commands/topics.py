"""Topic listing and detail commands."""
import typer
import httpx
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from mcl_cli.config import get_config

app = typer.Typer(help="Browse and inspect discovered topics.")
console = Console()


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
def list_topics(
    limit: int = typer.Option(20, "--limit", "-n", help="Number of topics to show"),
    sort: str = typer.Option("total", "--sort", "-s", help="Sort by: total, icp, timeliness, gap, proof"),
):
    """List discovered topics with scores."""
    cfg = get_config()
    _require_config(cfg)

    url = f"{cfg.api_url}/api/v1/workspaces/{cfg.workspace_id}/topics"
    params = {"limit": limit, "sort": sort}

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

    topics = data.get("topics", [])
    if not topics:
        console.print("[yellow]No topics found. Run 'mcl discover' first.[/yellow]")
        raise typer.Exit()

    table = Table(title="Topics", border_style="cyan")
    table.add_column("ID", style="dim", max_width=8)
    table.add_column("Topic", style="bold white", min_width=30)
    table.add_column("Pillar", style="bright_cyan")
    table.add_column("ICP", justify="center")
    table.add_column("Timely", justify="center")
    table.add_column("Gap", justify="center")
    table.add_column("Proof", justify="center")
    table.add_column("Total", justify="center", style="bold green")
    table.add_column("Status", style="dim")

    for topic in topics:
        scores = topic.get("scores", {})
        total = sum(scores.values()) if scores else 0
        table.add_row(
            str(topic.get("id", "-"))[:8],
            topic.get("title", "Untitled"),
            topic.get("pillar", "-"),
            str(scores.get("icp_relevance", "-")),
            str(scores.get("timeliness", "-")),
            str(scores.get("content_gap", "-")),
            str(scores.get("proof_potential", "-")),
            str(total),
            topic.get("status", "-"),
        )

    console.print(table)
    console.print(f"\n[dim]{len(topics)} topics shown (limit: {limit})[/dim]")


@app.command("show")
def show_topic(
    topic_id: str = typer.Argument(help="Topic ID to show details for"),
):
    """Show detailed information about a specific topic."""
    cfg = get_config()
    _require_config(cfg)

    url = f"{cfg.api_url}/api/v1/workspaces/{cfg.workspace_id}/topics/{topic_id}"

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=_get_headers(cfg))
            resp.raise_for_status()
            topic = resp.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            console.print(f"[red]Topic '{topic_id}' not found.[/red]")
        else:
            console.print(f"[red]API error: {exc.response.status_code} - {exc.response.text}[/red]")
        raise typer.Exit(1)
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {cfg.api_url}. Is the server running?[/red]")
        raise typer.Exit(1)

    scores = topic.get("scores", {})
    total = sum(scores.values()) if scores else 0

    console.print(
        Panel(
            f"[bold]{topic.get('title', 'Untitled')}[/bold]\n\n"
            f"Pillar: {topic.get('pillar', '-')}\n"
            f"Source: {topic.get('source', '-')}\n"
            f"Status: {topic.get('status', '-')}\n"
            f"Created: {topic.get('created_at', '-')}",
            title=f"Topic {topic.get('id', topic_id)}",
            border_style="bright_cyan",
        )
    )

    # Scores
    score_table = Table(title="Scores", border_style="green")
    score_table.add_column("Dimension", style="bold")
    score_table.add_column("Score", justify="center")
    score_table.add_row("ICP Relevance", str(scores.get("icp_relevance", "-")))
    score_table.add_row("Timeliness", str(scores.get("timeliness", "-")))
    score_table.add_row("Content Gap", str(scores.get("content_gap", "-")))
    score_table.add_row("Proof Potential", str(scores.get("proof_potential", "-")))
    score_table.add_row("[bold]Total[/bold]", f"[bold green]{total}[/bold green]")
    console.print(score_table)

    # Description
    description = topic.get("description", "")
    if description:
        console.print(
            Panel(description, title="Description", border_style="dim")
        )

    # Angles
    angles = topic.get("angles", [])
    if angles:
        console.print("\n[bold]Suggested Angles:[/bold]")
        for i, angle in enumerate(angles, 1):
            console.print(f"  {i}. {angle}")

    # Keywords
    keywords = topic.get("keywords", [])
    if keywords:
        console.print(f"\n[dim]Keywords: {', '.join(keywords)}[/dim]")
