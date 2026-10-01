import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const userA = 'user-a-1111';
  const userB = 'user-b-2222';

  const mockProject = {
    id: 'proj-1',
    userId: userA,
    name: 'Work',
    color: '#6957d9',
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [],
  };

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project for authenticated user', async () => {
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(userA, {
        name: 'Work',
        color: '#6957d9',
      });

      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          userId: userA,
          name: 'Work',
          color: '#6957d9',
        },
        include: {
          sections: {
            orderBy: { order: 'asc' },
          },
        },
      });
      expect(result.id).toEqual('proj-1');
      expect(result.name).toEqual('Work');
    });
  });

  describe('findAll', () => {
    it('should return all projects belonging to the user', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const results = await service.findAll(userA);

      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { userId: userA },
        orderBy: { createdAt: 'asc' },
        include: {
          sections: {
            orderBy: { order: 'asc' },
          },
        },
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return project if owned by user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne(userA, 'proj-1');
      expect(result.id).toEqual('proj-1');
    });

    it('should throw NotFoundException if project belongs to another user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.findOne(userB, 'proj-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userA, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project if owned by user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project.update.mockResolvedValue({
        ...mockProject,
        name: 'Renamed Project',
      });

      const result = await service.update(userA, 'proj-1', {
        name: 'Renamed Project',
      });

      expect(result.name).toEqual('Renamed Project');
    });

    it('should throw NotFoundException if updating another user project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.update(userB, 'proj-1', { name: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete project if owned by user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.project.delete.mockResolvedValue(mockProject);

      const result = await service.remove(userA, 'proj-1');
      expect(result).toEqual({ message: 'Project deleted successfully' });
    });

    it('should throw NotFoundException if deleting another user project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.remove(userB, 'proj-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
