import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SectionSummaryDto {
  @ApiProperty({ example: 'fa85f64a-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Backlog' })
  name: string;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ example: '2026-09-29T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-29T00:00:00.000Z' })
  updatedAt: Date;
}

export class ProjectResponseDto {
  @ApiProperty({ example: 'fa85f64a-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'Work & Projects' })
  name: string;

  @ApiPropertyOptional({ example: '#6957d9', nullable: true })
  color: string | null;

  @ApiProperty({ example: '2026-09-29T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-29T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => [SectionSummaryDto] })
  sections?: SectionSummaryDto[];
}
