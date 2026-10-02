import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AI_SERVICE_URL') return 'https://taskly-ai.onrender.com';
              if (key === 'AI_SERVICE_TIMEOUT') return 15000;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('breakDownTask', () => {
    it('should proxy request and return breakdown response with suggestions and subtasks', async () => {
      const mockResponse = {
        originalTitle: 'Build auth',
        suggestions: [
          { title: 'Plan: Build auth', priority: 'P2', estimatedMinutes: 30 },
        ],
        provider: 'mock',
        reasoning: 'Mock breakdown',
      };

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.breakDownTask({
        title: 'Build auth',
        maxSubtasks: 3,
      } as any);

      expect(result.originalTitle).toBe('Build auth');
      expect(result.suggestions).toHaveLength(1);
      expect(result.subtasks).toHaveLength(1);
      expect(result.provider).toBe('mock');
    });

    it('should support task field alias', async () => {
      const mockResponse = {
        originalTitle: 'Prepare for my Java exam',
        suggestions: [{ title: 'Study OOP', priority: 'P4' }],
        provider: 'openai',
      };

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.breakDownTask({
        task: 'Prepare for my Java exam',
      } as any);

      expect(result.originalTitle).toBe('Prepare for my Java exam');
      expect(result.suggestions).toHaveLength(1);
    });

    it('should throw 429 when AI service returns rate limit status', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit reached',
      } as Response);

      try {
        await service.breakDownTask({ title: 'Task' } as any);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('should throw 504 on request timeout', async () => {
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(timeoutError);

      try {
        await service.breakDownTask({ title: 'Task' } as any);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
      }
    });

    it('should throw 502 on malformed response without suggestions', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ wrongKey: 'no array here' }),
      } as Response);

      try {
        await service.breakDownTask({ title: 'Task' } as any);
        fail('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      }
    });

    it('should throw SERVICE_UNAVAILABLE when AI service is unreachable', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('ECONNREFUSED'),
      );

      await expect(
        service.breakDownTask({ title: 'Unreachable task' } as any),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when AI service responds', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          provider: 'openai',
          service: 'ai-service',
          version: '1.0.0',
        }),
      } as Response);

      const result = await service.checkHealth();
      expect(result.status).toBe('ok');
      expect(result.provider).toBe('openai');
    });

    it('should return unreachable when AI service is down', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('ECONNREFUSED'),
      );

      const result = await service.checkHealth();
      expect(result.status).toBe('unreachable');
      expect(result.provider).toBe('unknown');
    });
  });
});
