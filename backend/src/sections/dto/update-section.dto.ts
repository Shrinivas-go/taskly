import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateSectionDto {
  @ApiPropertyOptional({
    example: 'Completed',
    description: 'Updated name of the section',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Updated position order of the section',
  })
  @IsOptional()
  @IsInt({ message: 'Order must be an integer' })
  @Min(0, { message: 'Order must be at least 0' })
  order?: number;
}
