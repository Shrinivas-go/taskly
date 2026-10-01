import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskProjectSummaryDto {
  @ApiProperty({ example: 'fa85f64a-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Work & Projects' })
  name: string;

  @ApiPropertyOptional({ example: '#6957d9', nullable: true })
  color: string | null;
}

export class TaskSectionSummaryDto {
  @ApiProperty({ example: 'fa85f64a-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'In Progress' })
  name: string;
}

export class TaskLabelSummaryDto {
  @ApiProperty({ example: 'fa85f64a-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'Urgent' })
  name: string;

  @ApiPropertyOptional({ example: '#ef4444', nullable: true })
  color: string | null;
}

export class TaskResponseDto {
  @ApiProperty({ example: 'fa85f64a-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  parentTaskId: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  projectId?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  sectionId?: string | null;

  @ApiProperty({ example: 'Implement authentication system' })
  title: string;

  @ApiPropertyOptional({ example: 'Support **email/password** with bcrypt', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ example: '2026-10-01', nullable: true })
  dueDate: string | null;

  @ApiPropertyOptional({ example: '14:30', nullable: true })
  dueTime: string | null;

  @ApiProperty({ example: 4, description: '1: P1, 2: P2, 3: P3, 4: P4' })
  priority: number;

  @ApiProperty({ example: false })
  isCompleted: boolean;

  @ApiProperty({ example: '2026-09-28T21:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-28T21:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => TaskProjectSummaryDto, nullable: true })
  project?: TaskProjectSummaryDto | null;

  @ApiPropertyOptional({ type: () => TaskSectionSummaryDto, nullable: true })
  section?: TaskSectionSummaryDto | null;

  @ApiPropertyOptional({ type: () => [TaskLabelSummaryDto] })
  labels?: TaskLabelSummaryDto[];

  @ApiPropertyOptional({ type: () => [TaskResponseDto], description: 'Nested child subtasks' })
  subtasks?: TaskResponseDto[];
}
