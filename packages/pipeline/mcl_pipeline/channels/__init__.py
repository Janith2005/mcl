"""Channel plugin system for platform integrations."""
from mcl_pipeline.channels.registry import registry, register_default_channels

__all__ = ["registry", "register_default_channels"]
