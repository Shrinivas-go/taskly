"""Tests for the AI service FastAPI application."""

import json
import pytest
import httpx
from httpx import ASGITransport, AsyncClient, Response

from app.main import app
from app.providers import (
    MockProvider,
    OpenAIProvider,
    get_provider,
    sanitize_suggestion_title,
)
from app.models import (
    TaskBreakdownRequest,
    AIProviderTimeoutException,
    AIProviderRateLimitException,
    AIProviderAuthException,
    MalformedAIResponseException,
)


@pytest.fixture
def async_client():
    """Create an async test client with lifespan events enabled."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture(autouse=True)
def _setup_provider():
    """Ensure the AI provider is initialized for all tests."""
    import app.main as main_module
    main_module._provider = MockProvider()
    yield
    main_module._provider = None


# --- Health Check Tests ---


@pytest.mark.asyncio
async def test_health_check(async_client):
    """GET /health should return 200 with service info."""
    async with async_client as client:
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-service"
    assert data["version"] == "1.0.0"
    assert "provider" in data


# --- Task Breakdown Tests ---


@pytest.mark.asyncio
async def test_task_breakdown_success(async_client):
    """POST /ai/tasks/breakdown with valid payload should return subtasks."""
    async with async_client as client:
        response = await client.post(
            "/ai/tasks/breakdown",
            json={
                "title": "Build authentication system",
                "description": "Implement JWT-based auth",
                "maxSubtasks": 3,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["originalTitle"] == "Build authentication system"
    assert len(data["subtasks"]) == 3
    assert len(data["suggestions"]) == 3
    assert data["provider"] == "mock"
    assert data["reasoning"] is not None

    # Verify subtask structure
    for subtask in data["suggestions"]:
        assert "title" in subtask
        assert "priority" in subtask
        assert subtask["priority"] in ["P1", "P2", "P3", "P4"]


@pytest.mark.asyncio
async def test_task_breakdown_with_task_field_alias(async_client):
    """POST /ai/tasks/breakdown with 'task' field instead of 'title' should succeed."""
    async with async_client as client:
        response = await client.post(
            "/ai/tasks/breakdown",
            json={"task": "Prepare for my Java exam"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["originalTitle"] == "Prepare for my Java exam"
    assert "suggestions" in data
    assert len(data["suggestions"]) == 5


@pytest.mark.asyncio
async def test_task_breakdown_default_max_subtasks(async_client):
    """POST /ai/tasks/breakdown without maxSubtasks should default to 5."""
    async with async_client as client:
        response = await client.post(
            "/ai/tasks/breakdown",
            json={"title": "Design database schema"},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["subtasks"]) == 5
    assert len(data["suggestions"]) == 5


@pytest.mark.asyncio
async def test_task_breakdown_empty_title_rejected(async_client):
    """POST /ai/tasks/breakdown with empty title should return 422."""
    async with async_client as client:
        response = await client.post(
            "/ai/tasks/breakdown",
            json={"title": ""},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_task_breakdown_whitespace_title_rejected(async_client):
    """POST /ai/tasks/breakdown with whitespace-only title should return 422."""
    async with async_client as client:
        response = await client.post(
            "/ai/tasks/breakdown",
            json={"title": "   "},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_task_breakdown_missing_title_rejected(async_client):
    """POST /ai/tasks/breakdown without title should return 422."""
    async with async_client as client:
        response = await client.post(
            "/ai/tasks/breakdown",
            json={},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_task_breakdown_max_subtasks_boundary(async_client):
    """POST /ai/tasks/breakdown with maxSubtasks=2 should return exactly 2."""
    async with async_client as client:
        response = await client.post(
            "/ai/tasks/breakdown",
            json={"title": "Write unit tests", "maxSubtasks": 2},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["subtasks"]) == 2


@pytest.mark.asyncio
async def test_task_breakdown_max_subtasks_over_limit(async_client):
    """POST /ai/tasks/breakdown with maxSubtasks > 10 should return 422."""
    async with async_client as client:
        response = await client.post(
            "/ai/tasks/breakdown",
            json={"title": "Big project", "maxSubtasks": 15},
        )

    assert response.status_code == 422


# --- Provider Factory Tests ---


def test_get_mock_provider():
    """get_provider('mock') should return a MockProvider."""
    provider = get_provider("mock")
    assert isinstance(provider, MockProvider)
    assert provider.name == "mock"


def test_get_openai_provider():
    """get_provider('openai') and 'real' should return an OpenAIProvider."""
    provider = get_provider("openai")
    assert isinstance(provider, OpenAIProvider)
    assert provider.name in ("openai", "groq")

    real_provider = get_provider("real")
    assert isinstance(real_provider, OpenAIProvider)

    groq_provider = get_provider("groq")
    assert isinstance(groq_provider, OpenAIProvider)


def test_get_unknown_provider_raises():
    """get_provider with an unknown name should raise ValueError."""
    with pytest.raises(ValueError, match="Unknown AI provider"):
        get_provider("nonexistent")


@pytest.mark.asyncio
async def test_mock_provider_breakdown():
    """MockProvider should generate deterministic subtasks."""
    provider = MockProvider()
    request = TaskBreakdownRequest(
        title="Setup CI/CD pipeline",
        maxSubtasks=3,
    )
    result = await provider.break_down_task(request)

    assert result.originalTitle == "Setup CI/CD pipeline"
    assert len(result.subtasks) == 3
    assert len(result.suggestions) == 3
    assert result.provider == "mock"
    assert result.subtasks[0].title.startswith("Plan:")
    assert result.subtasks[1].title.startswith("Research:")
    assert result.subtasks[2].title.startswith("Implement:")


# --- OpenAI Provider Unit & Mock Transport Tests ---


@pytest.mark.asyncio
async def test_openai_provider_successful_structured_output():
    """OpenAIProvider should parse and validate valid structured JSON output."""
    mock_llm_payload = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": json.dumps(
                        {
                            "suggestions": [
                                {"title": "Study Java syntax and types"},
                                {"title": "Practice OOP principles and classes"},
                                {"title": "Review Java Collections Framework"},
                            ],
                            "reasoning": "Breakdown covering key study domains",
                        }
                    ),
                }
            }
        ]
    }

    def handler(request: httpx.Request):
        assert request.headers.get("authorization") == "Bearer test-key"
        return Response(200, json=mock_llm_payload)

    transport = httpx.MockTransport(handler)
    provider = OpenAIProvider(api_key="test-key", transport=transport)

    req = TaskBreakdownRequest(title="Prepare for my Java exam", maxSubtasks=3)
    res = await provider.break_down_task(req)

    assert res.originalTitle == "Prepare for my Java exam"
    assert len(res.suggestions) == 3
    assert res.suggestions[0].title == "Study Java syntax and types"
    assert res.suggestions[1].title == "Practice OOP principles and classes"
    assert res.suggestions[2].title == "Review Java Collections Framework"
    assert res.reasoning == "Breakdown covering key study domains"


@pytest.mark.asyncio
async def test_openai_provider_malformed_json_raises():
    """OpenAIProvider should raise MalformedAIResponseException on unparseable JSON."""
    def handler(request: httpx.Request):
        return Response(200, text="not valid json at all")

    transport = httpx.MockTransport(handler)
    provider = OpenAIProvider(api_key="test-key", transport=transport)

    req = TaskBreakdownRequest(title="Test task")
    with pytest.raises(MalformedAIResponseException):
        await provider.break_down_task(req)


@pytest.mark.asyncio
async def test_openai_provider_missing_suggestions_raises():
    """OpenAIProvider should raise MalformedAIResponseException if suggestions field is missing."""
    mock_payload = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({"wrong_key": "some text"}),
                }
            }
        ]
    }

    def handler(request: httpx.Request):
        return Response(200, json=mock_payload)

    transport = httpx.MockTransport(handler)
    provider = OpenAIProvider(api_key="test-key", transport=transport)

    req = TaskBreakdownRequest(title="Test task")
    with pytest.raises(MalformedAIResponseException):
        await provider.break_down_task(req)


@pytest.mark.asyncio
async def test_openai_provider_rate_limit_error():
    """OpenAIProvider should raise AIProviderRateLimitException on HTTP 429."""
    def handler(request: httpx.Request):
        return Response(429, json={"error": "Rate limit reached"})

    transport = httpx.MockTransport(handler)
    provider = OpenAIProvider(api_key="test-key", transport=transport)

    req = TaskBreakdownRequest(title="Test task")
    with pytest.raises(AIProviderRateLimitException):
        await provider.break_down_task(req)


@pytest.mark.asyncio
async def test_openai_provider_auth_error():
    """OpenAIProvider should raise AIProviderAuthException on HTTP 401."""
    def handler(request: httpx.Request):
        return Response(401, json={"error": "Invalid API key"})

    transport = httpx.MockTransport(handler)
    provider = OpenAIProvider(api_key="test-key", transport=transport)

    req = TaskBreakdownRequest(title="Test task")
    with pytest.raises(AIProviderAuthException):
        await provider.break_down_task(req)


@pytest.mark.asyncio
async def test_openai_provider_timeout_error():
    """OpenAIProvider should raise AIProviderTimeoutException on timeout."""
    def handler(request: httpx.Request):
        raise httpx.ReadTimeout("Timeout reading from server")

    transport = httpx.MockTransport(handler)
    provider = OpenAIProvider(api_key="test-key", transport=transport)

    req = TaskBreakdownRequest(title="Test task")
    with pytest.raises(AIProviderTimeoutException):
        await provider.break_down_task(req)


# --- Output Sanitization Tests ---


def test_sanitize_suggestion_title():
    """Verify output sanitization filters malicious patterns and markdown."""
    # Basic markdown cleanup
    assert sanitize_suggestion_title("  **Review code**  ") == "Review code"
    assert sanitize_suggestion_title("1. Create database schema") == "Create database schema"
    assert sanitize_suggestion_title("- Write unit tests") == "Write unit tests"

    # Reject executable code & scripts
    assert sanitize_suggestion_title("<script>alert('xss')</script>") is None
    assert sanitize_suggestion_title("Run eval(window.location)") is None

    # Reject SQL injection statements
    assert sanitize_suggestion_title("DROP TABLE users;") is None
    assert sanitize_suggestion_title("SELECT * FROM tasks WHERE id = 1 UNION SELECT password FROM users") is None
    assert sanitize_suggestion_title("DELETE FROM accounts") is None

    # Reject shell commands
    assert sanitize_suggestion_title("rm -rf /") is None
    assert sanitize_suggestion_title("sudo rm file") is None

    # Empty string
    assert sanitize_suggestion_title("") is None
    assert sanitize_suggestion_title("   ") is None

