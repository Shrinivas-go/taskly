import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({
    example: 'In Progress',
    description: 'Name of the section',
    maxLength: 255,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required and cannot be empty' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Ordering position of section within project',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Order must be an integer' })
  @Min(0, { message: 'Order must be at least 0' })
  order?: number;
}
