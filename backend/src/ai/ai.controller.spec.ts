import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  const mockAiService = {
    breakDownTask: jest.fn(),
    checkHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('breakDownTask', () => {
    it('should call aiService.breakDownTask and return result', async () => {
      const mockResult = {
        originalTitle: 'Test task',
        subtasks: [{ title: 'Plan: Test task', priority: 'P2' }],
        provider: 'mock',
        reasoning: 'Mock reasoning',
      };
      mockAiService.breakDownTask.mockResolvedValue(mockResult);

      const result = await controller.breakDownTask({
        title: 'Test task',
        maxSubtasks: 3,
      });

      expect(service.breakDownTask).toHaveBeenCalledWith({
        title: 'Test task',
        maxSubtasks: 3,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('checkHealth', () => {
    it('should call aiService.checkHealth and return result', async () => {
      const mockHealth = { status: 'ok', provider: 'mock' };
      mockAiService.checkHealth.mockResolvedValue(mockHealth);

      const result = await controller.checkHealth();

      expect(service.checkHealth).toHaveBeenCalled();
      expect(result).toEqual(mockHealth);
    });
  });
});
