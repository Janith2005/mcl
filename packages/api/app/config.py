"""Application settings via pydantic-settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    supabase_url: str = "http://localhost:54321"
    supabase_anon_key: str = "your-anon-key"
    supabase_service_role_key: str = "your-service-role-key"
    redis_url: str = "redis://localhost:6379"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    youtube_data_api_key: str = ""
    resend_api_key: str = ""
    sentry_dsn: str = ""
    posthog_api_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    environment: str = "development"
