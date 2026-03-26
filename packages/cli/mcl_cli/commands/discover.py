"""Topic discovery command with competitor and keyword scanning."""
import typer
import httpx
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from mcl_cli.config import get_config

app = typer.Typer(help="Discover trending topics for your content.")
console = Console()


@app.callback(invoke_without_command=True)
def discover(
    competitors: bool = typer.Option(False, "--competitors", "-c", help="Scan competitor content"),
    keywords: bool = typer.Option(False, "--keywords", "-k", help="Scan keyword trends"),
    all_sources: bool = typer.Option(False, "--all", "-a", help="Scan all sources"),
):
    """Run topic discovery against competitors, keywords, or all sources.

    Results are scored on ICP relevance, timeliness, content gap, and proof potential.
    """
    cfg = get_config()

    if not cfg.api_key:
        console.print("[red]No API key configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)
    if not cfg.workspace_id:
        console.print("[red]No workspace ID configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)

    sources = []
    if all_sources:
        sources = ["competitors", "keywords", "trends"]
    else:
        if competitors:
            sources.append("competitors")
        if keywords:
            sources.append("keywords")
        if not sources:
            sources = ["competitors", "keywords", "trends"]

    url = f"{cfg.api_url}/api/v1/workspaces/{cfg.workspace_id}/pipeline/discover"
    headers = {"Authorization": f"Bearer {cfg.api_key}"}

    console.print(
        Panel(
            f"Scanning sources: [bold]{', '.join(sources)}[/bold]",
            title="Influence Pirates - Discovery",
            border_style="bright_cyan",
        )
    )

    try:
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url, headers=headers, json={"sources": sources})
            resp.raise_for_status()
            data = resp.json()

        topics = data.get("topics", [])
        if not topics:
            console.print("[yellow]No topics found. Try expanding your sources.[/yellow]")
            raise typer.Exit()

        table = Table(title="Discovered Topics", border_style="cyan")
        table.add_column("Topic", style="bold white", min_width=30)
        table.add_column("ICP", justify="center")
        table.add_column("Timely", justify="center")
        table.add_column("Gap", justify="center")
        table.add_column("Proof", justify="center")
        table.add_column("Total", justify="center", style="bold green")
        table.add_column("Source", style="dim")

        for topic in topics:
            scores = topic.get("scores", {})
            total = sum(scores.values())
            table.add_row(
                topic.get("title", "Untitled"),
                str(scores.get("icp_relevance", "-")),
                str(scores.get("timeliness", "-")),
                str(scores.get("content_gap", "-")),
                str(scores.get("proof_potential", "-")),
                str(total),
                topic.get("source", "-"),
            )

        console.print(table)
        console.print(f"\n[dim]{len(topics)} topics discovered.[/dim]")

    except httpx.HTTPStatusError as exc:
        console.print(f"[red]API error: {exc.response.status_code} - {exc.response.text}[/red]")
        raise typer.Exit(1)
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {cfg.api_url}. Is the server running?[/red]")
        raise typer.Exit(1)
