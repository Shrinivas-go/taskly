import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'Updated Project Name',
    description: 'Updated name of the project',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: '#10b981',
    description: 'Updated color hex code or identifier',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Color must be a string' })
  @MaxLength(50, { message: 'Color cannot exceed 50 characters' })
  color?: string;
}
