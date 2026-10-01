import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService, TaskBreakdownResponse } from './ai.service';
import { TaskBreakdownDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('tasks/breakdown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Break down a task into subtasks using AI',
    description:
      'Sends a task title and optional description to the AI service, which returns suggested subtasks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Task successfully broken down into subtasks',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 502,
    description: 'AI service returned an error',
  })
  @ApiResponse({
    status: 503,
    description: 'AI service is unavailable',
  })
  async breakDownTask(
    @Body() dto: TaskBreakdownDto,
  ): Promise<TaskBreakdownResponse> {
    return this.aiService.breakDownTask(dto);
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check AI service health',
    description: 'Returns the health status of the downstream AI microservice.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI service health status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkHealth(): Promise<{ status: string; provider: string }> {
    return this.aiService.checkHealth();
  }
}
