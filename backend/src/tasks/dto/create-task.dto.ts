import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Implement authentication system',
    description: 'Title of the task',
    maxLength: 500,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required and cannot be empty' })
  @MaxLength(500, { message: 'Title cannot exceed 500 characters' })
  title: string;

  @ApiPropertyOptional({
    example: 'Support **email/password** with bcrypt hashing.',
    description: 'Optional markdown-formatted task description (FR-TASK-007)',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Optional ISO date string for due date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO date string (e.g. YYYY-MM-DD)' })
  dueDate?: string;

  @ApiPropertyOptional({
    example: '14:30',
    description: 'Optional due time formatted as HH:mm',
  })
  @IsOptional()
  @IsString({ message: 'dueTime must be a string' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'dueTime must be in 24-hour format HH:mm (e.g. 14:30)',
  })
  dueTime?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Task priority: 1 (P1/Urgent), 2 (P2/High), 3 (P3/Medium), 4 (P4/Default)',
    default: 4,
    minimum: 1,
    maximum: 4,
  })
  @IsOptional()
  @IsInt({ message: 'Priority must be an integer between 1 and 4' })
  @Min(1, { message: 'Priority must be at least 1 (P1)' })
  @Max(4, { message: 'Priority must be at most 4 (P4)' })
  priority?: number;

  @ApiPropertyOptional({
    example: 'd9b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Optional UUID of parent task for creating subtasks (FR-TASK-006)',
  })
  @IsOptional()
  @IsUUID('all', { message: 'parentTaskId must be a valid UUID' })
  parentTaskId?: string;

  @ApiPropertyOptional({
    example: 'd9b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Optional UUID of the project this task belongs to',
  })
  @IsOptional()
  @IsUUID('all', { message: 'projectId must be a valid UUID' })
  projectId?: string;

  @ApiPropertyOptional({
    example: 'd9b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Optional UUID of the section within the project',
  })
  @IsOptional()
  @IsUUID('all', { message: 'sectionId must be a valid UUID' })
  sectionId?: string;

  @ApiPropertyOptional({
    example: ['d9b2c3d4-e5f6-7890-abcd-ef1234567890'],
    description: 'Optional array of label UUIDs to attach to this task',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'labelIds must be an array of UUIDs' })
  @IsUUID('all', { each: true, message: 'Each label ID must be a valid UUID' })
  labelIds?: string[];
}
