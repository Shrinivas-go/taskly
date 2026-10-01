import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: Partial<PrismaService>;

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status ok for liveness', () => {
    const result = controller.check();
    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('uptime');
    expect(typeof result.uptime).toBe('number');
  });

  it('should return live status ok for explicit live endpoint', () => {
    const result = controller.live();
    expect(result).toHaveProperty('status', 'ok');
  });

  it('should return 200 OK when database is ready', async () => {
    const res = mockResponse();
    await controller.ready(res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        database: 'connected',
      }),
    );
  });

  it('should return 503 Service Unavailable when database connection fails', async () => {
    (prismaService.$queryRaw as jest.Mock).mockRejectedValueOnce(
      new Error('Connection timeout'),
    );
    const res = mockResponse();
    await controller.ready(res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unhealthy',
        database: 'disconnected',
        error: 'Connection timeout',
      }),
    );
  });
});

