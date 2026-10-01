import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLabelDto {
  @ApiPropertyOptional({
    example: 'High Priority',
    description: 'Updated name of the label',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: '#f59e0b',
    description: 'Updated color hex or identifier',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Color must be a string' })
  @MaxLength(50, { message: 'Color cannot exceed 50 characters' })
  color?: string;
}
