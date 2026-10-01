import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({
    example: 'Urgent',
    description: 'Name of the label',
    maxLength: 255,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required and cannot be empty' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    example: '#ef4444',
    description: 'Optional color hex or identifier for the label',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Color must be a string' })
  @MaxLength(50, { message: 'Color cannot exceed 50 characters' })
  color?: string;
}
