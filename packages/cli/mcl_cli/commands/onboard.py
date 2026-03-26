"""Interactive brain setup command with local and cloud modes."""
import typer
import httpx
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

from mcl_cli.config import get_config

app = typer.Typer(help="Interactive onboarding to build your Influence Pirates brain.")
console = Console()


@app.callback(invoke_without_command=True)
def onboard(
    mode: str = typer.Option(None, "--mode", "-m", help="Mode: local or cloud (overrides config)"),
):
    """Run the interactive onboarding flow to populate your brain.

    In local mode, walks through each brain section using prompts from
    mcl_pipeline. In cloud mode, sends responses to the API for processing.
    """
    cfg = get_config()
    run_mode = mode or cfg.mode

    console.print(
        Panel(
            "[bold]Welcome to Influence Pirates onboarding![/bold]\n\n"
            "I'll walk you through 9 sections to build your creator brain.\n"
            "This brain powers every recommendation, topic score, and script.",
            title="Influence Pirates - Onboard",
            border_style="bright_cyan",
        )
    )

    if run_mode == "local":
        _onboard_local()
    else:
        _onboard_cloud(cfg)


def _onboard_local():
    """Run onboarding locally using pipeline prompts."""
    try:
        from mcl_pipeline.prompts.onboard import get_section_prompts
    except ImportError:
        console.print(
            "[red]mcl-pipeline is not installed. Install it or use --mode cloud.[/red]"
        )
        raise typer.Exit(1)

    section_prompts = get_section_prompts()
    responses: dict[str, str] = {}

    for section, prompt_text in section_prompts.items():
        console.print(f"\n[bold cyan]--- {section.replace('_', ' ').title()} ---[/bold cyan]")
        console.print(f"[dim]{prompt_text}[/dim]\n")
        answer = Prompt.ask(f"[bold]{section.replace('_', ' ').title()}[/bold]")
        responses[section] = answer

    console.print("\n[bold green]Onboarding complete![/bold green]")
    console.print(
        Panel(
            "\n".join(f"[cyan]{k.replace('_', ' ').title()}:[/cyan] {v}" for k, v in responses.items()),
            title="Your Responses",
            border_style="green",
        )
    )
    console.print(
        "[dim]In a future release, these responses will be processed by the AI coach "
        "to build your full brain. Use cloud mode for the complete experience.[/dim]"
    )


def _onboard_cloud(cfg):
    """Run onboarding via the Influence Pirates API."""
    if not cfg.api_key:
        console.print("[red]No API key configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)
    if not cfg.workspace_id:
        console.print("[red]No workspace ID configured. Run 'mcl setup' first.[/red]")
        raise typer.Exit(1)

    url = f"{cfg.api_url}/api/v1/workspaces/{cfg.workspace_id}/pipeline/onboard"
    headers = {"Authorization": f"Bearer {cfg.api_key}"}

    console.print(f"[dim]Connecting to {cfg.api_url}...[/dim]")

    try:
        with httpx.Client(timeout=60.0) as client:
            # Start onboarding session
            resp = client.post(url, headers=headers, json={"action": "start"})
            resp.raise_for_status()
            session = resp.json()

            console.print("[green]Onboarding session started.[/green]\n")

            while session.get("status") != "complete":
                question = session.get("question", "")
                section = session.get("section", "")

                if question:
                    console.print(f"[bold cyan]--- {section.replace('_', ' ').title()} ---[/bold cyan]")
                    console.print(f"{question}\n")
                    answer = Prompt.ask("[bold]Your answer[/bold]")

                    resp = client.post(
                        url,
                        headers=headers,
                        json={"action": "respond", "section": section, "answer": answer},
                    )
                    resp.raise_for_status()
                    session = resp.json()
                else:
                    break

            console.print("\n[bold green]Onboarding complete! Your brain has been updated.[/bold green]")

    except httpx.HTTPStatusError as exc:
        console.print(f"[red]API error: {exc.response.status_code} - {exc.response.text}[/red]")
        raise typer.Exit(1)
    except httpx.ConnectError:
        console.print(f"[red]Could not connect to {cfg.api_url}. Is the server running?[/red]")
        raise typer.Exit(1)
