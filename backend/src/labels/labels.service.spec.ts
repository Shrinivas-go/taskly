import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LabelsService', () => {
  let service: LabelsService;

  const userA = 'user-a-1111';
  const userB = 'user-b-2222';

  const mockLabel = {
    id: 'lbl-1',
    userId: userA,
    name: 'Urgent',
    color: '#ef4444',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    label: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LabelsService>(LabelsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create label for authenticated user', async () => {
      mockPrismaService.label.findUnique.mockResolvedValue(null);
      mockPrismaService.label.create.mockResolvedValue(mockLabel);

      const result = await service.create(userA, {
        name: 'Urgent',
        color: '#ef4444',
      });

      expect(result.id).toEqual('lbl-1');
      expect(result.name).toEqual('Urgent');
    });

    it('should reject duplicate label name for the same user', async () => {
      mockPrismaService.label.findUnique.mockResolvedValue(mockLabel);

      await expect(
        service.create(userA, { name: 'Urgent' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should list all labels for user', async () => {
      mockPrismaService.label.findMany.mockResolvedValue([mockLabel]);

      const results = await service.findAll(userA);
      expect(results).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return label if owned by user', async () => {
      mockPrismaService.label.findUnique.mockResolvedValue(mockLabel);

      const result = await service.findOne(userA, 'lbl-1');
      expect(result.id).toEqual('lbl-1');
    });

    it('should reject looking up another user label', async () => {
      mockPrismaService.label.findUnique.mockResolvedValue(mockLabel);

      await expect(service.findOne(userB, 'lbl-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update label if owned by user', async () => {
      mockPrismaService.label.findUnique.mockResolvedValue(mockLabel);
      mockPrismaService.label.findFirst.mockResolvedValue(null);
      mockPrismaService.label.update.mockResolvedValue({
        ...mockLabel,
        name: 'Very Urgent',
      });

      const result = await service.update(userA, 'lbl-1', {
        name: 'Very Urgent',
      });
      expect(result.name).toEqual('Very Urgent');
    });

    it('should reject updating another user label', async () => {
      mockPrismaService.label.findUnique.mockResolvedValue(mockLabel);

      await expect(
        service.update(userB, 'lbl-1', { name: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete label if owned by user', async () => {
      mockPrismaService.label.findUnique.mockResolvedValue(mockLabel);
      mockPrismaService.label.delete.mockResolvedValue(mockLabel);

      const result = await service.remove(userA, 'lbl-1');
      expect(result).toEqual({ message: 'Label deleted successfully' });
    });

    it('should reject deleting another user label', async () => {
      mockPrismaService.label.findUnique.mockResolvedValue(mockLabel);

      await expect(service.remove(userB, 'lbl-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
