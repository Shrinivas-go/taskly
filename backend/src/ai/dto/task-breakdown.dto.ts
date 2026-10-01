import {
  IsString,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TaskBreakdownDto {
  @ApiPropertyOptional({
    description: 'Task title to break down into subtasks',
    example: 'Build authentication system',
    minLength: 1,
    maxLength: 255,
  })
  @ValidateIf((o) => !o.task || o.title !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Alternative field name for task title',
    example: 'Prepare for my Java exam',
    minLength: 1,
    maxLength: 255,
  })
  @ValidateIf((o) => !o.title || o.task !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  task?: string;

  @ApiPropertyOptional({
    description: 'Optional task description for additional context',
    example: 'Implement JWT-based auth with registration and login',
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of subtasks to generate (2-10)',
    example: 5,
    default: 5,
    minimum: 2,
    maximum: 10,
  })
  @IsInt()
  @IsOptional()
  @Min(2)
  @Max(10)
  maxSubtasks?: number = 5;

  getEffectiveTitle?(): string {
    return (this.title || this.task || '').trim();
  }
}


