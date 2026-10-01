import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'Work & Projects',
    description: 'Name of the project',
    maxLength: 255,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required and cannot be empty' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    example: '#6957d9',
    description: 'Color hex code or identifier for project visual identity',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Color must be a string' })
  @MaxLength(50, { message: 'Color cannot exceed 50 characters' })
  color?: string;
}
