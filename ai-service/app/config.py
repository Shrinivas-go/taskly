import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """AI Service configuration loaded from environment variables."""

    # Service settings
    AI_SERVICE_HOST: str = "0.0.0.0"
    AI_SERVICE_PORT: int = 8000
    AI_SERVICE_ENV: str = "development"

    # AI Provider configuration
    AI_PROVIDER: str = "mock"  # "mock" | "openai"
    AI_API_KEY: Optional[str] = None
    AI_MODEL: Optional[str] = None
    AI_BASE_URL: Optional[str] = None
    AI_TIMEOUT_SECONDS: float = 30.0

    # Internal service communication
    NESTJS_BACKEND_URL: str = "https://taskly-backend-rsdd.onrender.com"

    # Rate limiting (requests per minute per client)
    AI_MAX_REQUESTS_PER_MINUTE: int = 30

    def get_api_key(self) -> Optional[str]:
        """Resolve the AI API key from config or environment without logging secrets."""
        return (
            self.AI_API_KEY
            or os.environ.get("AI_API_KEY")
            or os.environ.get("OPENAI_API_KEY")
            or os.environ.get("GROQ_API_KEY")
        )

    def get_base_url(self) -> str:
        """Resolve base URL for the OpenAI-compatible provider."""
        if self.AI_BASE_URL:
            return self.AI_BASE_URL.rstrip("/")
        # If a Groq key is present in environment, automatically route to Groq's OpenAI-compatible API
        api_key = self.get_api_key() or ""
        if api_key.startswith("gsk_"):
            return "https://api.groq.com/openai/v1"
        return "https://api.openai.com/v1"

    def get_model(self) -> str:
        """Resolve model name for the provider."""
        if self.AI_MODEL:
            return self.AI_MODEL
        api_key = self.get_api_key() or ""
        if api_key.startswith("gsk_"):
            return "qwen/qwen3.8-27b"
        return "gpt-4o-mini"

    model_config = {
        "env_file": ["../.env", ".env"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()

