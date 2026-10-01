import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'engineer@todoist.dev' })
  email: string;

  @ApiProperty({ example: 'local' })
  authProvider: string;

  @ApiProperty({ example: '2026-09-28T21:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-28T21:00:00.000Z' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Signed JWT access token',
  })
  accessToken: string;
}
