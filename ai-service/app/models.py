"""Pydantic models for AI service request/response schemas."""

from pydantic import BaseModel, Field, model_validator
from typing import Optional, Any
from enum import Enum


class TaskPriority(str, Enum):
    """Task priority levels matching the main application."""
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class SubtaskSuggestion(BaseModel):
    """A single subtask suggestion from the AI breakdown."""
    title: str = Field(..., min_length=1, max_length=255, description="Suggested subtask title")
    description: Optional[str] = Field(None, max_length=1000, description="Optional subtask description")
    priority: TaskPriority = Field(default=TaskPriority.P4, description="Suggested priority level")
    estimatedMinutes: Optional[int] = Field(None, ge=1, le=480, description="Estimated time in minutes")


class TaskBreakdownRequest(BaseModel):
    """Request body for the task breakdown endpoint.
    
    Accepts either 'task' or 'title' for flexibility with client conventions.
    """
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Task title to break down")
    task: Optional[str] = Field(None, min_length=1, max_length=255, description="Alternative field for task title")
    description: Optional[str] = Field(None, max_length=2000, description="Optional task description for context")
    maxSubtasks: int = Field(default=5, ge=2, le=10, description="Maximum number of subtasks to generate")

    @model_validator(mode="before")
    @classmethod
    def normalize_title_and_task(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Resolve title from task or title
            title_val = data.get("title") or data.get("task")
            if title_val is not None:
                if isinstance(title_val, str):
                    title_val = title_val.strip()
                if not title_val:
                    raise ValueError("Task title cannot be empty or only whitespace")
                data["title"] = title_val
                if "task" not in data:
                    data["task"] = title_val
            else:
                raise ValueError("Task title ('title' or 'task') is required")
        return data

    @property
    def effective_title(self) -> str:
        return self.title or self.task or ""


class TaskBreakdownResponse(BaseModel):
    """Response body for the task breakdown endpoint."""
    originalTitle: str = Field(..., description="Original task title that was broken down")
    suggestions: list[SubtaskSuggestion] = Field(..., description="List of suggested subtasks")
    subtasks: list[SubtaskSuggestion] = Field(..., description="Subtasks list (alias for suggestions)")
    provider: str = Field(..., description="AI provider used for generation")
    reasoning: Optional[str] = Field(None, description="Brief explanation of the breakdown approach")

    @model_validator(mode="before")
    @classmethod
    def sync_suggestions_and_subtasks(cls, data: Any) -> Any:
        if isinstance(data, dict):
            sugg = data.get("suggestions")
            subs = data.get("subtasks")
            if sugg is not None and subs is None:
                data["subtasks"] = sugg
            elif subs is not None and sugg is None:
                data["suggestions"] = subs
        return data


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(default="ok")
    service: str = Field(default="ai-service")
    version: str = Field(default="1.0.0")
    provider: str = Field(..., description="Currently configured AI provider")


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str = Field(..., description="Error description")


# --- Custom AI Exceptions ---


class AIException(Exception):
    """Base exception for AI provider operations."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AIProviderTimeoutException(AIException):
    """Raised when the AI provider times out."""
    def __init__(self, message: str = "AI provider request timed out"):
        super().__init__(message, status_code=504)


class AIProviderRateLimitException(AIException):
    """Raised when the AI provider rate limits the request."""
    def __init__(self, message: str = "AI provider rate limit exceeded. Please try again later."):
        super().__init__(message, status_code=429)


class AIProviderAuthException(AIException):
    """Raised when AI provider authentication fails."""
    def __init__(self, message: str = "AI provider authentication failed"):
        super().__init__(message, status_code=502)


class MalformedAIResponseException(AIException):
    """Raised when AI provider returns malformed or non-compliant output."""
    def __init__(self, message: str = "AI provider returned malformed structured output"):
        super().__init__(message, status_code=502)


class AIProviderUnavailableException(AIException):
    """Raised when AI provider cannot be reached."""
    def __init__(self, message: str = "AI provider is temporarily unavailable"):
        super().__init__(message, status_code=502)

