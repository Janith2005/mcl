"""Setup command to configure Influence Pirates CLI."""
import typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

from mcl_cli.config import CLIConfig, get_config, CONFIG_FILE

app = typer.Typer(help="Configure the Influence Pirates CLI.")
console = Console()


@app.callback(invoke_without_command=True)
def setup():
    """Interactive setup for Influence Pirates CLI configuration.

    Configures API URL, API key, workspace ID, and mode.
    Settings are saved to ~/.mcl/config.toml.
    """
    cfg = get_config()

    console.print(
        Panel(
            "[bold]Influence Pirates CLI Setup[/bold]\n\n"
            "Configure your connection to the Influence Pirates API.\n"
            "Press Enter to keep the current value shown in brackets.",
            title="Setup",
            border_style="bright_cyan",
        )
    )

    cfg.api_url = Prompt.ask(
        "API URL",
        default=cfg.api_url,
    )

    cfg.api_key = Prompt.ask(
        "API Key",
        default=cfg.api_key if cfg.api_key else None,
        password=True,
    )

    cfg.workspace_id = Prompt.ask(
        "Workspace ID",
        default=cfg.workspace_id if cfg.workspace_id else None,
    )

    cfg.mode = Prompt.ask(
        "Mode",
        choices=["cloud", "local"],
        default=cfg.mode,
    )

    cfg.save()

    console.print(f"\n[green]Configuration saved to {CONFIG_FILE}[/green]")
    console.print(
        Panel(
            f"API URL:      {cfg.api_url}\n"
            f"API Key:      {'*' * len(cfg.api_key) if cfg.api_key else '(not set)'}\n"
            f"Workspace ID: {cfg.workspace_id or '(not set)'}\n"
            f"Mode:         {cfg.mode}",
            title="Current Config",
            border_style="green",
        )
    )
