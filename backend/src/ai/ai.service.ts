import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskBreakdownDto } from './dto';

/** Shape of a single subtask suggestion from the AI service. */
export interface SubtaskSuggestion {
  title: string;
  description?: string;
  priority: string;
  estimatedMinutes?: number;
}

/** Shape of the AI service breakdown response. */
export interface TaskBreakdownResponse {
  originalTitle: string;
  suggestions: SubtaskSuggestion[];
  subtasks: SubtaskSuggestion[];
  provider: string;
  reasoning?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') || 'https://taskly-ai.onrender.com';
    this.timeoutMs =
      Number(this.configService.get<number>('AI_SERVICE_TIMEOUT')) || 35000;
  }

  /**
   * Proxy a task breakdown request to the FastAPI AI service.
   *
   * The NestJS layer handles authentication; the AI service is internal only.
   */
  async breakDownTask(dto: TaskBreakdownDto): Promise<TaskBreakdownResponse> {
    const url = `${this.aiServiceUrl}/ai/tasks/breakdown`;
    const effectiveTitle = dto.getEffectiveTitle ? dto.getEffectiveTitle() : (dto.title || dto.task || '').trim();

    if (!effectiveTitle) {
      throw new HttpException('Task title is required', HttpStatus.BAD_REQUEST);
    }

    // Safe logging: log metadata length instead of full potentially sensitive user task content
    this.logger.log(
      `Proxying task breakdown request [title_len=${effectiveTitle.length}, max_subtasks=${dto.maxSubtasks ?? 5}]`,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: effectiveTitle,
          task: effectiveTitle,
          description: dto.description,
          maxSubtasks: dto.maxSubtasks ?? 5,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(
          `AI service returned HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        );

        if (response.status === 429) {
          throw new HttpException(
            'AI rate limit reached. Please wait a moment before trying again.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else if (response.status === 504) {
          throw new HttpException(
            'AI provider request timed out. Please try again.',
            HttpStatus.GATEWAY_TIMEOUT,
          );
        } else if (response.status === 502) {
          throw new HttpException(
            'AI provider is temporarily unavailable. Please try again later.',
            HttpStatus.BAD_GATEWAY,
          );
        } else if (response.status === 400 || response.status === 422) {
          throw new HttpException(
            'Invalid task breakdown request',
            HttpStatus.BAD_REQUEST,
          );
        } else {
          throw new HttpException(
            'AI service encountered an error',
            HttpStatus.BAD_GATEWAY,
          );
        }
      }

      const data = await response.json();

      // Validate and harmonize suggestions and subtasks
      const rawList = data.suggestions || data.subtasks;
      if (!Array.isArray(rawList)) {
        this.logger.error('AI service response missing suggestions array');
        throw new HttpException(
          'AI service returned malformed response',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const suggestions: SubtaskSuggestion[] = rawList.map((item: any) => ({
        title: String(item.title || ''),
        description: item.description ? String(item.description) : undefined,
        priority: String(item.priority || 'P4'),
        estimatedMinutes: item.estimatedMinutes ? Number(item.estimatedMinutes) : undefined,
      }));

      const result: TaskBreakdownResponse = {
        originalTitle: data.originalTitle || effectiveTitle,
        suggestions,
        subtasks: suggestions,
        provider: data.provider || 'unknown',
        reasoning: data.reasoning,
      };

      this.logger.log(
        `AI breakdown completed: returned ${suggestions.length} suggestions via '${result.provider}'`,
      );

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        this.logger.error(`AI service request timed out after ${this.timeoutMs}ms`);
        throw new HttpException(
          'AI service request timed out. Please try again.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      this.logger.error(`Failed to reach AI service: ${error.message}`);
      throw new HttpException(
        'AI service is unavailable. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Check the health of the AI service.
   */
  async checkHealth(): Promise<{ status: string; provider: string }> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return { status: 'unhealthy', provider: 'unknown' };
      }
      const data = await response.json();
      return { status: data.status, provider: data.provider };
    } catch {
      return { status: 'unreachable', provider: 'unknown' };
    }
  }
}

