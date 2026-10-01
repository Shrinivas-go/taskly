import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new project owned by the authenticated user.
   */
  async create(userId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.create({
      data: {
        userId,
        name: dto.name.trim(),
        color: dto.color ?? null,
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.toProjectDto(project);
  }

  /**
   * Retrieves all projects owned by the authenticated user.
   */
  async findAll(userId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return projects.map((p) => this.toProjectDto(p));
  }

  /**
   * Retrieves a single project by ID for the authenticated user.
   */
  async findOne(userId: string, projectId: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with identifier '${projectId}' not found`);
    }

    return this.toProjectDto(project);
  }

  /**
   * Partially updates a project owned by the authenticated user.
   */
  async update(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException(`Project with identifier '${projectId}' not found`);
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.toProjectDto(updated);
  }

  /**
   * Deletes a project owned by the authenticated user.
   * Cascades deletion to sections and tasks per database constraints.
   */
  async remove(userId: string, projectId: string): Promise<{ message: string }> {
    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException(`Project with identifier '${projectId}' not found`);
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return { message: 'Project deleted successfully' };
  }

  private toProjectDto(project: any): ProjectResponseDto {
    return {
      id: project.id,
      userId: project.userId,
      name: project.name,
      color: project.color,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      sections: project.sections?.map((s: any) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }
}
