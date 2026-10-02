"""FastAPI AI Service - main application entry point.

This service provides AI-powered task breakdown functionality.
It runs as an internal microservice behind the NestJS authentication boundary.
"""

import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .models import (
    TaskBreakdownRequest,
    TaskBreakdownResponse,
    HealthResponse,
    ErrorResponse,
    AIException,
    AIProviderTimeoutException,
    AIProviderRateLimitException,
    AIProviderAuthException,
    MalformedAIResponseException,
    AIProviderUnavailableException,
)
from .providers import get_provider, AIProvider

logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Module-level provider instance, initialized during app lifespan
_provider: AIProvider | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize and clean up resources."""
    global _provider
    try:
        provider_name = settings.AI_PROVIDER
        # If an AI API key is configured and provider was set to mock or auto, promote to real provider
        if settings.get_api_key() and provider_name.lower() in ("mock", "auto"):
            logger.info("AI API key detected in environment; auto-activating real AI provider")
            provider_name = "openai"

        _provider = get_provider(provider_name)
        logger.info(f"AI Service started successfully with provider: {_provider.name}")
    except Exception as e:
        logger.error(f"Failed to initialize provider '{settings.AI_PROVIDER}': {e}")
        # Default to mock provider as fallback for stability
        _provider = get_provider("mock")
        logger.info("Fell back to mock provider for service stability")

    yield

    logger.info("AI Service shutting down")
    _provider = None


app = FastAPI(
    title="Todoist AI Service",
    description="Internal AI microservice for task breakdown and intelligent features",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check endpoint",
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """Return service health status and current provider configuration."""
    provider_name = _provider.name if _provider else settings.AI_PROVIDER
    return HealthResponse(
        status="ok",
        service="ai-service",
        version="1.0.0",
        provider=provider_name,
    )


@app.post(
    "/ai/tasks/breakdown",
    response_model=TaskBreakdownResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        429: {"model": ErrorResponse, "description": "AI provider rate limit exceeded"},
        502: {"model": ErrorResponse, "description": "AI provider or upstream error"},
        504: {"model": ErrorResponse, "description": "AI provider timeout"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    summary="Break down a task into subtasks",
    tags=["AI Tasks"],
)
async def break_down_task(request: TaskBreakdownRequest) -> TaskBreakdownResponse:
    """Break a task into actionable subtasks using the configured AI provider.
    
    This endpoint is called by the NestJS backend (which handles authentication).
    It should NOT be exposed directly to frontend clients.
    """
    if _provider is None:
        logger.error("Request received but AI provider is not initialized")
        raise HTTPException(
            status_code=500,
            detail="AI provider not initialized",
        )

    task_title = request.effective_title
    # Safe logging: log metadata without exposing entire task or sensitive tokens
    logger.info(
        f"Processing task breakdown request [title_len={len(task_title)}, max_subtasks={request.maxSubtasks}, provider={_provider.name}]"
    )

    try:
        result = await _provider.break_down_task(request)
        logger.info(
            f"Task breakdown succeeded: returned {len(result.suggestions)} suggestions via provider '{result.provider}'"
        )
        return result
    except AIProviderTimeoutException as e:
        logger.error(f"Provider timeout: {e.message}")
        raise HTTPException(status_code=504, detail="AI provider request timed out")
    except AIProviderRateLimitException as e:
        logger.warning(f"Provider rate limit: {e.message}")
        raise HTTPException(status_code=429, detail="AI provider rate limit exceeded. Please try again shortly.")
    except AIProviderAuthException as e:
        logger.error("Provider authentication failed. Check server environment API key.")
        raise HTTPException(status_code=502, detail="AI provider configuration error")
    except MalformedAIResponseException as e:
        logger.error(f"Provider malformed output: {e.message}")
        raise HTTPException(status_code=502, detail="AI provider returned malformed structured output")
    except AIProviderUnavailableException as e:
        logger.error(f"Provider unavailable: {e.message}")
        raise HTTPException(status_code=502, detail="AI provider is temporarily unavailable")
    except AIException as e:
        logger.error(f"AI provider error: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.exception("Unexpected error during task breakdown")
        raise HTTPException(
            status_code=500,
            detail="Unexpected error occurred while generating task breakdown",
        )

