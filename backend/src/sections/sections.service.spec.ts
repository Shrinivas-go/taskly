import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SectionsService', () => {
  let service: SectionsService;

  const userA = 'user-a-1111';
  const userB = 'user-b-2222';
  const projectId = 'proj-1';

  const mockProject = {
    id: projectId,
    userId: userA,
    name: 'Work',
  };

  const mockSection = {
    id: 'sec-1',
    projectId,
    name: 'To Do',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: mockProject,
  };

  const mockPrismaService = {
    project: {
      findUnique: jest.fn(),
    },
    section: {
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
        SectionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SectionsService>(SectionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a section if user owns project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.section.findFirst.mockResolvedValue(null);
      mockPrismaService.section.create.mockResolvedValue(mockSection);

      const result = await service.create(userA, projectId, { name: 'To Do' });

      expect(result.id).toEqual('sec-1');
      expect(result.name).toEqual('To Do');
    });

    it('should reject creating section if project belongs to another user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.create(userB, projectId, { name: 'To Do' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByProject', () => {
    it('should list sections if user owns project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.section.findMany.mockResolvedValue([mockSection]);

      const results = await service.findAllByProject(userA, projectId);
      expect(results).toHaveLength(1);
    });

    it('should reject listing sections if project belongs to another user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.findAllByProject(userB, projectId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update section if user owns project', async () => {
      mockPrismaService.section.findUnique.mockResolvedValue(mockSection);
      mockPrismaService.section.update.mockResolvedValue({
        ...mockSection,
        name: 'In Progress',
      });

      const result = await service.update(userA, 'sec-1', {
        name: 'In Progress',
      });
      expect(result.name).toEqual('In Progress');
    });

    it('should reject updating section if project belongs to another user', async () => {
      mockPrismaService.section.findUnique.mockResolvedValue(mockSection);

      await expect(
        service.update(userB, 'sec-1', { name: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete section if user owns project', async () => {
      mockPrismaService.section.findUnique.mockResolvedValue(mockSection);
      mockPrismaService.section.delete.mockResolvedValue(mockSection);

      const result = await service.remove(userA, 'sec-1');
      expect(result).toEqual({ message: 'Section deleted successfully' });
    });

    it('should reject deleting section if project belongs to another user', async () => {
      mockPrismaService.section.findUnique.mockResolvedValue(mockSection);

      await expect(service.remove(userB, 'sec-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
