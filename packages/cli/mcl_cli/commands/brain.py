"""Brain inspection and export commands."""
import json
import typer
import httpx
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from mcl_cli.config import get_config

app = typer.Typer(help="Inspect and export your Influence Pirates brain.")
console = Console()


@app.command()
def show():
    """Display a formatted summary of your brain."""
    cfg = get_config()

    if not cfg.api_key:
        console.print("[red]No API key configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)
    if not cfg.workspace_id:
        console.print("[red]No workspace ID configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)

    url = f"{cfg.api_url}/api/v1/workspaces/{cfg.workspace_id}/brain"
    headers = {"Authorization": f"Bearer {cfg.api_key}"}

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            brain = resp.json()
    except httpx.HTTPStatusError as exc:
        console.print(f"[red]API error: {exc.response.status_code} - {exc.response.text}[/red]")
        raise typer.Exit(1)
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {cfg.api_url}. Is the server running?[/red]")
        raise typer.Exit(1)

    identity = brain.get("identity", {})
    icp = brain.get("icp", {})
    pillars = brain.get("pillars", [])
    platforms = brain.get("platforms", {})
    competitors = brain.get("competitors", [])
    monetization = brain.get("monetization", {})
    metadata = brain.get("metadata", {})

    # Identity panel
    console.print(
        Panel(
            f"[bold]{identity.get('name', 'Unknown')}[/bold] ({identity.get('brand', '-')})\n"
            f"Niche: {identity.get('niche', '-')}\n"
            f"Tone: {', '.join(identity.get('tone', []))}\n"
            f"Differentiator: {identity.get('differentiator', '-')}",
            title="Identity",
            border_style="bright_cyan",
        )
    )

    # ICP panel
    console.print(
        Panel(
            f"Segments: {', '.join(icp.get('segments', []))}\n"
            f"Pain Points: {', '.join(icp.get('pain_points', []))}\n"
            f"Goals: {', '.join(icp.get('goals', []))}",
            title="Ideal Customer Profile",
            border_style="bright_magenta",
        )
    )

    # Pillars table
    if pillars:
        pillar_table = Table(title="Content Pillars", border_style="cyan")
        pillar_table.add_column("Name", style="bold")
        pillar_table.add_column("Description")
        pillar_table.add_column("Keywords", style="dim")
        for p in pillars:
            pillar_table.add_row(
                p.get("name", "-"),
                p.get("description", "-"),
                ", ".join(p.get("keywords", [])),
            )
        console.print(pillar_table)

    # Platforms
    console.print(
        Panel(
            f"Research: {', '.join(platforms.get('research', []))}\n"
            f"Posting: {', '.join(platforms.get('posting', []))}",
            title="Platforms",
            border_style="green",
        )
    )

    # Competitors
    if competitors:
        comp_table = Table(title="Competitors", border_style="yellow")
        comp_table.add_column("Name", style="bold")
        comp_table.add_column("Platform")
        comp_table.add_column("Handle")
        comp_table.add_column("Why Watch", style="dim")
        for c in competitors:
            comp_table.add_row(
                c.get("name", "-"),
                c.get("platform", "-"),
                c.get("handle", "-"),
                c.get("why_watch", "-"),
            )
        console.print(comp_table)

    # Monetization
    console.print(
        Panel(
            f"Primary Funnel: {monetization.get('primary_funnel', '-')}\n"
            f"Secondary: {', '.join(monetization.get('secondary_funnels', []))}\n"
            f"Client Capture: {monetization.get('client_capture', '-')}",
            title="Monetization",
            border_style="bright_green",
        )
    )

    # Metadata
    console.print(
        f"\n[dim]Brain v{metadata.get('version', '?')} | "
        f"Updated: {metadata.get('updated_at', '?')} | "
        f"Last onboard: {metadata.get('last_onboard', 'never')}[/dim]"
    )


@app.command()
def export(
    output: str = typer.Option(None, "--output", "-o", help="Output file path (default: stdout)"),
    pretty: bool = typer.Option(True, "--pretty/--compact", help="Pretty-print JSON"),
):
    """Export your brain as JSON."""
    cfg = get_config()

    if not cfg.api_key:
        console.print("[red]No API key configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)
    if not cfg.workspace_id:
        console.print("[red]No workspace ID configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)

    url = f"{cfg.api_url}/api/v1/workspaces/{cfg.workspace_id}/brain"
    headers = {"Authorization": f"Bearer {cfg.api_key}"}

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            brain = resp.json()
    except httpx.HTTPStatusError as exc:
        console.print(f"[red]API error: {exc.response.status_code} - {exc.response.text}[/red]")
        raise typer.Exit(1)
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {cfg.api_url}. Is the server running?[/red]")
        raise typer.Exit(1)

    indent = 2 if pretty else None
    json_str = json.dumps(brain, indent=indent, default=str)

    if output:
        with open(output, "w") as f:
            f.write(json_str)
        console.print(f"[green]Brain exported to {output}[/green]")
    else:
        typer.echo(json_str)
