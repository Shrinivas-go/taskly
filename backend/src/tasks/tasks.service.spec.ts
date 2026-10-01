import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TasksService', () => {
  let service: TasksService;

  const userA = 'user-a-1111';
  const userB = 'user-b-2222';

  const mockTask = {
    id: 'task-1',
    userId: userA,
    parentTaskId: null,
    projectId: null,
    sectionId: null,
    title: 'Test Task',
    description: 'Markdown description',
    dueDate: new Date('2026-10-01'),
    dueTime: '14:30',
    priority: 1,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    subtasks: [],
    project: null,
    section: null,
    taskLabels: [],
  };

  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    section: {
      findUnique: jest.fn(),
    },
    label: {
      findMany: jest.fn(),
    },
    taskLabel: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task with default priority 4 when unspecified', async () => {
      mockPrismaService.task.create.mockResolvedValue({
        ...mockTask,
        priority: 4,
        description: null,
        dueDate: null,
        dueTime: null,
      });

      const result = await service.create(userA, {
        title: 'New Task',
      });

      expect(result.priority).toBe(4);
      expect(result.isCompleted).toBe(false);
      expect(mockPrismaService.task.create).toHaveBeenCalled();
    });

    it('should reject creating task if parent task belongs to another user', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        ...mockTask,
        id: 'parent-1',
        userId: userB,
      });

      await expect(
        service.create(userA, {
          title: 'Subtask',
          parentTaskId: 'parent-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create task under own project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: userA,
      });
      mockPrismaService.task.create.mockResolvedValue({
        ...mockTask,
        projectId: 'proj-1',
        project: { id: 'proj-1', name: 'Work', color: '#6957d9' },
      });

      const result = await service.create(userA, {
        title: 'Project Task',
        projectId: 'proj-1',
      });

      expect(result.projectId).toEqual('proj-1');
      expect(result.project?.name).toEqual('Work');
    });

    it('should reject creating task under another user project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: userB,
      });

      await expect(
        service.create(userA, {
          title: 'Project Task',
          projectId: 'proj-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject creating task if section belongs to another project', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        userId: userA,
      });
      mockPrismaService.section.findUnique.mockResolvedValue({
        id: 'sec-1',
        projectId: 'proj-2',
        project: { userId: userA },
      });

      await expect(
        service.create(userA, {
          title: 'Section Task',
          projectId: 'proj-1',
          sectionId: 'sec-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject creating task if label belongs to another user', async () => {
      mockPrismaService.label.findMany.mockResolvedValue([]);

      await expect(
        service.create(userA, {
          title: 'Labeled Task',
          labelIds: ['lbl-foreign'],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all tasks for the authenticated user', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.findAll(userA);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Task');
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith({
        where: { userId: userA },
        orderBy: { createdAt: 'asc' },
        include: {
          project: { select: { id: true, name: true, color: true } },
          section: { select: { id: true, name: true } },
          taskLabels: {
            include: {
              label: { select: { id: true, name: true, color: true } },
            },
          },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return task when owned by user', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findOne(userA, 'task-1');

      expect(result.id).toBe('task-1');
      expect(result.title).toBe('Test Task');
    });

    it('should throw NotFoundException when task belongs to another user (anti-IDOR)', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        ...mockTask,
        userId: userB,
      });

      await expect(service.findOne(userA, 'task-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userA, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update task attributes when owned by user', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        title: 'Updated Title',
        priority: 2,
      });

      const result = await service.update(userA, 'task-1', {
        title: 'Updated Title',
        priority: 2,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.priority).toBe(2);
    });

    it('should reject self-parenting', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.update(userA, 'task-1', { parentTaskId: 'task-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleComplete', () => {
    it('should toggle isCompleted flag', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        isCompleted: true,
      });

      const result = await service.toggleComplete(userA, 'task-1');

      expect(result.isCompleted).toBe(true);
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { isCompleted: true },
        include: {
          project: { select: { id: true, name: true, color: true } },
          section: { select: { id: true, name: true } },
          taskLabels: {
            include: {
              label: { select: { id: true, name: true, color: true } },
            },
          },
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete task when owned by user', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.delete.mockResolvedValue(mockTask);

      const result = await service.remove(userA, 'task-1');

      expect(result).toEqual({ message: 'Task deleted successfully' });
      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });
    });

    it('should reject deletion if task belongs to another user', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        ...mockTask,
        userId: userB,
      });

      await expect(service.remove(userA, 'task-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
