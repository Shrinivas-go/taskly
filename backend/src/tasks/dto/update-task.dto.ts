import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    example: 'Updated task title',
    description: 'Updated title of the task',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(500, { message: 'Title cannot exceed 500 characters' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated task description',
    description: 'Updated markdown description',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    example: '2026-10-02',
    description: 'Updated ISO date string for due date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO date string' })
  dueDate?: string | null;

  @ApiPropertyOptional({
    example: '16:00',
    description: 'Updated due time (HH:mm)',
  })
  @IsOptional()
  @IsString({ message: 'dueTime must be a string' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'dueTime must be in 24-hour format HH:mm',
  })
  dueTime?: string | null;

  @ApiPropertyOptional({
    example: 2,
    description: 'Updated task priority (1=P1, 2=P2, 3=P3, 4=P4)',
    minimum: 1,
    maximum: 4,
  })
  @IsOptional()
  @IsInt({ message: 'Priority must be an integer between 1 and 4' })
  @Min(1)
  @Max(4)
  priority?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Toggle task completion state (FR-TASK-004)',
  })
  @IsOptional()
  @IsBoolean({ message: 'isCompleted must be a boolean' })
  isCompleted?: boolean;

  @ApiPropertyOptional({
    example: 'd9b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Updated parent task UUID (or null to detach)',
  })
  @IsOptional()
  @IsUUID('all', { message: 'parentTaskId must be a valid UUID' })
  parentTaskId?: string | null;

  @ApiPropertyOptional({
    example: 'd9b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Updated project UUID (or null to unassign from project)',
  })
  @IsOptional()
  @IsUUID('all', { message: 'projectId must be a valid UUID' })
  projectId?: string | null;

  @ApiPropertyOptional({
    example: 'd9b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Updated section UUID (or null to unassign from section)',
  })
  @IsOptional()
  @IsUUID('all', { message: 'sectionId must be a valid UUID' })
  sectionId?: string | null;

  @ApiPropertyOptional({
    example: ['d9b2c3d4-e5f6-7890-abcd-ef1234567890'],
    description: 'Updated array of label UUIDs to assign to this task',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'labelIds must be an array of UUIDs' })
  @IsUUID('all', { each: true, message: 'Each label ID must be a valid UUID' })
  labelIds?: string[];
}
