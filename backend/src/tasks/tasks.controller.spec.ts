import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;

  const mockUser = { id: 'usr-123', email: 'user@example.com' };

  const mockTask = {
    id: 'tsk-456',
    userId: 'usr-123',
    parentTaskId: null,
    title: 'Task 1',
    description: null,
    dueDate: null,
    dueTime: null,
    priority: 4,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTasksService = {
    create: jest.fn().mockResolvedValue(mockTask),
    findAll: jest.fn().mockResolvedValue([mockTask]),
    findOne: jest.fn().mockResolvedValue(mockTask),
    update: jest.fn().mockResolvedValue(mockTask),
    toggleComplete: jest.fn().mockResolvedValue({ ...mockTask, isCompleted: true }),
    remove: jest.fn().mockResolvedValue({ message: 'Task deleted successfully' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: mockTasksService }],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to TasksService with user id', async () => {
    const dto = { title: 'New Task' };
    const result = await controller.create(mockUser, dto);
    expect(result).toBe(mockTask);
    expect(mockTasksService.create).toHaveBeenCalledWith(mockUser.id, dto);
  });

  it('should delegate findAll to TasksService with user id', async () => {
    const result = await controller.findAll(mockUser);
    expect(result).toEqual([mockTask]);
    expect(mockTasksService.findAll).toHaveBeenCalledWith(mockUser.id);
  });

  it('should delegate findOne to TasksService with user id and task id', async () => {
    const result = await controller.findOne(mockUser, 'tsk-456');
    expect(result).toBe(mockTask);
    expect(mockTasksService.findOne).toHaveBeenCalledWith(mockUser.id, 'tsk-456');
  });

  it('should delegate update to TasksService', async () => {
    const dto = { title: 'Updated' };
    const result = await controller.update(mockUser, 'tsk-456', dto);
    expect(result).toBe(mockTask);
    expect(mockTasksService.update).toHaveBeenCalledWith(mockUser.id, 'tsk-456', dto);
  });

  it('should delegate toggleComplete to TasksService', async () => {
    const result = await controller.toggleComplete(mockUser, 'tsk-456');
    expect(result.isCompleted).toBe(true);
    expect(mockTasksService.toggleComplete).toHaveBeenCalledWith(mockUser.id, 'tsk-456');
  });

  it('should delegate remove to TasksService', async () => {
    const result = await controller.remove(mockUser, 'tsk-456');
    expect(result).toEqual({ message: 'Task deleted successfully' });
    expect(mockTasksService.remove).toHaveBeenCalledWith(mockUser.id, 'tsk-456');
  });
});
