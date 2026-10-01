import { Controller, Get, HttpStatus, Optional, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check endpoint to verify backend process is running' })
  @ApiResponse({
    status: 200,
    description: 'Process is alive and operational',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-09-28T21:00:00.000Z',
        uptime: 12.34,
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Explicit liveness endpoint without external dependencies' })
  live() {
    return this.check();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check verifying database availability' })
  @ApiResponse({
    status: 200,
    description: 'Backend is ready to receive traffic (database connection responsive)',
  })
  @ApiResponse({
    status: 503,
    description: 'Backend is not ready to receive traffic (database connection failed)',
  })
  async ready(@Res() res: Response) {
    if (!this.prisma) {
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        database: 'not_configured',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    }

    try {
      // Execute a lightweight query to verify active PostgreSQL database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Database ping failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

