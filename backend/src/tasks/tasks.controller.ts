import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task or nested subtask (FR-TASK-001/006)' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Parent task not found or belongs to another user' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tasks owned by the authenticated user (FR-TASK-002)' })
  @ApiResponse({
    status: 200,
    description: 'List of user tasks',
    type: [TaskResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<TaskResponseDto[]> {
    return this.tasksService.findAll(user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tasks by keyword across title, description, project, section, and labels' })
  @ApiQuery({ name: 'q', description: 'Search keyword', required: true })
  @ApiResponse({
    status: 200,
    description: 'Matching tasks list',
    type: [TaskResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') query: string,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.search(user.id, query || '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve an individual task by ID with nested subtasks' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found or owned by another user' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(user.id, id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'List direct subtasks for a parent task' })
  @ApiParam({ name: 'id', description: 'Parent Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of child subtasks',
    type: [TaskResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Parent task not found or owned by another user' })
  findChildren(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.findChildren(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update task attributes (FR-TASK-003)' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found or owned by another user' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(user.id, id, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Toggle completion state of a task (FR-TASK-004)' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task completion toggled successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found or owned by another user' })
  toggleComplete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.toggleComplete(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task and its child subtasks (FR-TASK-005)' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully',
    schema: { example: { message: 'Task deleted successfully' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found or owned by another user' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.tasksService.remove(user.id, id);
  }
}
