"""MCL CLI entrypoint."""
import typer

from mcl_cli.commands import onboard, discover, brain, setup, topics, jobs

app = typer.Typer(
    name="mcl",
    help="Influence Pirates - Content pipeline from your terminal.",
)

# Register subcommands
app.add_typer(onboard.app, name="onboard")
app.add_typer(discover.app, name="discover")
app.add_typer(brain.app, name="brain")
app.add_typer(setup.app, name="setup")
app.add_typer(topics.app, name="topics")
app.add_typer(jobs.app, name="jobs")


def version_callback(value: bool):
    if value:
        typer.echo("mcl 0.1.0")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(False, "--version", callback=version_callback, is_eager=True),
):
    """Influence Pirates - Content pipeline from your terminal."""
    pass


if __name__ == "__main__":
    app()
