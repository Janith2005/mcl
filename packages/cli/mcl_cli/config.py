"""CLI configuration stored at ~/.mcl/config.toml."""
from pathlib import Path
from dataclasses import dataclass
import toml

CONFIG_DIR = Path.home() / ".mcl"
CONFIG_FILE = CONFIG_DIR / "config.toml"


@dataclass
class CLIConfig:
    api_url: str = "http://localhost:8000"
    api_key: str = ""
    workspace_id: str = ""
    mode: str = "cloud"  # cloud | local

    @classmethod
    def load(cls) -> "CLIConfig":
        if CONFIG_FILE.exists():
            data = toml.load(CONFIG_FILE)
            return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})
        return cls()

    def save(self):
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        data = {k: getattr(self, k) for k in self.__annotations__}
        with open(CONFIG_FILE, "w") as f:
            toml.dump(data, f)


def get_config() -> CLIConfig:
    return CLIConfig.load()
