import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new task or nested subtask for the authenticated user.
   * Enforces that parent tasks, projects, sections, and labels belong to the user.
   */
  async create(userId: string, dto: CreateTaskDto): Promise<TaskResponseDto> {
    // Validate parent task ownership if parentTaskId is supplied (FR-TASK-006)
    if (dto.parentTaskId) {
      const parentTask = await this.prisma.task.findUnique({
        where: { id: dto.parentTaskId },
      });

      if (!parentTask || parentTask.userId !== userId) {
        throw new NotFoundException(
          `Parent task with identifier '${dto.parentTaskId}' not found`,
        );
      }
    }

    // Validate cross-resource ownership for project, section, and labels
    const { resolvedProjectId } = await this.validateCrossResourceOwnership(
      userId,
      dto.projectId,
      dto.sectionId,
      dto.labelIds,
    );

    const task = await this.prisma.task.create({
      data: {
        userId,
        title: dto.title.trim(),
        description: dto.description ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        dueTime: dto.dueTime ?? null,
        priority: dto.priority ?? 4,
        parentTaskId: dto.parentTaskId ?? null,
        projectId: resolvedProjectId ?? null,
        sectionId: dto.sectionId ?? null,
        isCompleted: false,
        ...(dto.labelIds && dto.labelIds.length > 0 && {
          taskLabels: {
            create: Array.from(new Set(dto.labelIds)).map((labelId) => ({
              labelId,
            })),
          },
        }),
      },
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

    return this.toTaskDto(task);
  }

  /**
   * Retrieves all tasks owned by the authenticated user.
   * Isolates data strictly to the authenticated user (FR-AUTHZ-001).
   */
  async findAll(userId: string): Promise<TaskResponseDto[]> {
    const tasks = await this.prisma.task.findMany({
      where: { userId },
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

    return tasks.map((t) => this.toTaskDto(t));
  }

  /**
   * Retrieves a single task owned by the authenticated user, including nested subtasks.
   * Returns 404 if the task belongs to another user to prevent ID enumeration.
   */
  async findOne(userId: string, taskId: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
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

    if (!task || task.userId !== userId) {
      throw new NotFoundException(
        `Task with identifier '${taskId}' not found`,
      );
    }

    // Fetch all user descendant tasks with parentTaskId to construct arbitrary-depth hierarchy
    const allDescendantCandidates = await this.prisma.task.findMany({
      where: { userId, parentTaskId: { not: null } },
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

    const childrenByParent = new Map<string, any[]>();
    for (const item of allDescendantCandidates) {
      if (item.parentTaskId) {
        if (!childrenByParent.has(item.parentTaskId)) {
          childrenByParent.set(item.parentTaskId, []);
        }
        childrenByParent.get(item.parentTaskId)!.push(item);
      }
    }

    const buildTree = (node: any): TaskResponseDto => {
      const children = childrenByParent.get(node.id) || [];
      const childDtos: TaskResponseDto[] = children.map((c) => buildTree(c));
      return this.toTaskDto(node, childDtos.length > 0 ? childDtos : undefined);
    };

    return buildTree(task);
  }

  /**
   * Retrieves direct child subtasks for a parent task.
   */
  async findChildren(userId: string, parentTaskId: string): Promise<TaskResponseDto[]> {
    const parentTask = await this.prisma.task.findUnique({
      where: { id: parentTaskId },
    });

    if (!parentTask || parentTask.userId !== userId) {
      throw new NotFoundException(
        `Parent task with identifier '${parentTaskId}' not found`,
      );
    }

    const children = await this.prisma.task.findMany({
      where: { userId, parentTaskId },
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

    return children.map((t) => this.toTaskDto(t));
  }

  /**
   * Performs basic keyword search across task title, description, project name, section name, and labels.
   * Strictly enforces data isolation to the authenticated user (FR-AUTHZ-001).
   */
  async search(userId: string, query: string): Promise<TaskResponseDto[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const trimmed = query.trim();

    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: trimmed, mode: 'insensitive' } },
          { description: { contains: trimmed, mode: 'insensitive' } },
          { project: { name: { contains: trimmed, mode: 'insensitive' } } },
          { section: { name: { contains: trimmed, mode: 'insensitive' } } },
          {
            taskLabels: {
              some: {
                label: { name: { contains: trimmed, mode: 'insensitive' } },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
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

    return tasks.map((t) => this.toTaskDto(t));
  }

  /**
   * Partially updates a task owned by the authenticated user.
   * Preserves unspecified fields and validates parent task constraints.
   */
  async update(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    // Verify existing task and ownership
    const existingTask = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask || existingTask.userId !== userId) {
      throw new NotFoundException(
        `Task with identifier '${taskId}' not found`,
      );
    }

    // Validate updated parentTaskId if provided
    if (dto.parentTaskId !== undefined && dto.parentTaskId !== null) {
      if (dto.parentTaskId === taskId) {
        throw new BadRequestException('A task cannot be its own parent');
      }

      const parentTask = await this.prisma.task.findUnique({
        where: { id: dto.parentTaskId },
      });

      if (!parentTask || parentTask.userId !== userId) {
        throw new NotFoundException(
          `Parent task with identifier '${dto.parentTaskId}' not found`,
        );
      }

      const isCycle = await this.wouldCreateCycle(taskId, dto.parentTaskId);
      if (isCycle) {
        throw new BadRequestException('Circular task hierarchy is not permitted');
      }
    }

    // Cross-resource validation if project, section, or labels are being updated
    let targetProjectId =
      dto.projectId !== undefined ? dto.projectId : existingTask.projectId;
    const targetSectionId =
      dto.sectionId !== undefined ? dto.sectionId : existingTask.sectionId;

    if (
      dto.projectId !== undefined ||
      dto.sectionId !== undefined ||
      dto.labelIds !== undefined
    ) {
      const { resolvedProjectId } = await this.validateCrossResourceOwnership(
        userId,
        targetProjectId,
        targetSectionId,
        dto.labelIds,
      );
      if (dto.projectId === undefined && resolvedProjectId) {
        targetProjectId = resolvedProjectId;
      }
    }

    // Update label associations if labelIds provided
    if (dto.labelIds !== undefined) {
      await this.prisma.taskLabel.deleteMany({
        where: { taskId },
      });

      if (dto.labelIds.length > 0) {
        const uniqueLabelIds = Array.from(new Set(dto.labelIds));
        await this.prisma.taskLabel.createMany({
          data: uniqueLabelIds.map((labelId) => ({
            taskId,
            labelId,
          })),
        });
      }
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.dueTime !== undefined && { dueTime: dto.dueTime }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.isCompleted !== undefined && { isCompleted: dto.isCompleted }),
        ...(dto.parentTaskId !== undefined && {
          parentTaskId: dto.parentTaskId,
        }),
        ...(dto.projectId !== undefined && {
          projectId: dto.projectId,
        }),
        ...(dto.sectionId !== undefined && {
          sectionId: dto.sectionId,
        }),
      },
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

    return this.toTaskDto(updatedTask);
  }

  /**
   * Toggles completion status of a task owned by the authenticated user.
   */
  async toggleComplete(userId: string, taskId: string): Promise<TaskResponseDto> {
    const existingTask = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask || existingTask.userId !== userId) {
      throw new NotFoundException(
        `Task with identifier '${taskId}' not found`,
      );
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        isCompleted: !existingTask.isCompleted,
      },
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

    return this.toTaskDto(updatedTask);
  }

  /**
   * Deletes a task owned by the authenticated user.
   * Cascades deletion to nested subtasks per System Design Section 9.3.
   */
  async remove(userId: string, taskId: string): Promise<{ message: string }> {
    const existingTask = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask || existingTask.userId !== userId) {
      throw new NotFoundException(
        `Task with identifier '${taskId}' not found`,
      );
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return { message: 'Task deleted successfully' };
  }

  /**
   * Validates cross-resource ownership:
   * 1. If projectId is provided, verifies user owns project.
   * 2. If sectionId is provided, verifies user owns section's project, and that section belongs to projectId (if specified).
   * 3. If labelIds are provided, verifies user owns all specified labels.
   */
  private async validateCrossResourceOwnership(
    userId: string,
    projectId?: string | null,
    sectionId?: string | null,
    labelIds?: string[],
  ): Promise<{ resolvedProjectId?: string | null }> {
    let resolvedProjectId = projectId;

    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project || project.userId !== userId) {
        throw new NotFoundException(`Project with identifier '${projectId}' not found`);
      }
    }

    if (sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: sectionId },
        include: { project: true },
      });
      if (!section || section.project.userId !== userId) {
        throw new NotFoundException(`Section with identifier '${sectionId}' not found`);
      }

      if (resolvedProjectId && section.projectId !== resolvedProjectId) {
        throw new BadRequestException('Section does not belong to the specified project');
      }

      if (!resolvedProjectId) {
        resolvedProjectId = section.projectId;
      }
    }

    if (labelIds && labelIds.length > 0) {
      const uniqueLabelIds = Array.from(new Set(labelIds));
      const labels = await this.prisma.label.findMany({
        where: {
          id: { in: uniqueLabelIds },
          userId,
        },
      });

      if (labels.length !== uniqueLabelIds.length) {
        throw new NotFoundException('One or more labels not found or belong to another user');
      }
    }

    return { resolvedProjectId };
  }

  /**
   * Checks whether assigning proposedParentId to taskId would introduce a cycle.
   * Traverses upwards along parentTaskId: if taskId is reached, a cycle would form.
   */
  private async wouldCreateCycle(taskId: string, proposedParentId: string): Promise<boolean> {
    let currentId: string | null = proposedParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === taskId) {
        return true;
      }
      if (visited.has(currentId)) {
        return true;
      }
      visited.add(currentId);

      const task: { parentTaskId: string | null } | null = await this.prisma.task.findUnique({
        where: { id: currentId },
        select: { parentTaskId: true },
      });

      if (!task) break;
      currentId = task.parentTaskId;
    }

    return false;
  }

  private toTaskDto(task: any, subtasks?: TaskResponseDto[]): TaskResponseDto {
    return {
      id: task.id,
      userId: task.userId,
      parentTaskId: task.parentTaskId,
      projectId: task.projectId ?? null,
      sectionId: task.sectionId ?? null,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate
        ? (task.dueDate instanceof Date ? task.dueDate.toISOString().split('T')[0] : String(task.dueDate).split('T')[0])
        : null,
      dueTime: task.dueTime,
      priority: task.priority,
      isCompleted: task.isCompleted,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      project: task.project
        ? {
            id: task.project.id,
            name: task.project.name,
            color: task.project.color,
          }
        : null,
      section: task.section
        ? {
            id: task.section.id,
            name: task.section.name,
          }
        : null,
      labels: task.taskLabels
        ? task.taskLabels.map((tl: any) => ({
            id: tl.label.id,
            name: tl.label.name,
            color: tl.label.color,
          }))
        : [],
      ...(subtasks && subtasks.length > 0 && {
        subtasks,
      }),
    };
  }
}
