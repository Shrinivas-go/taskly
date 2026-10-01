import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SectionResponseDto } from './dto/section-response.dto';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new section within a project.
   * Validates that the project exists and belongs to the authenticated user.
   */
  async create(
    userId: string,
    projectId: string,
    dto: CreateSectionDto,
  ): Promise<SectionResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with identifier '${projectId}' not found`);
    }

    let order = dto.order;
    if (order === undefined || order === null) {
      const highestSection = await this.prisma.section.findFirst({
        where: { projectId },
        orderBy: { order: 'desc' },
      });
      order = highestSection ? highestSection.order + 1 : 0;
    }

    const section = await this.prisma.section.create({
      data: {
        projectId,
        name: dto.name.trim(),
        order,
      },
    });

    return this.toSectionDto(section);
  }

  /**
   * Retrieves all sections for a given project.
   * Enforces project ownership verification.
   */
  async findAllByProject(
    userId: string,
    projectId: string,
  ): Promise<SectionResponseDto[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with identifier '${projectId}' not found`);
    }

    const sections = await this.prisma.section.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    return sections.map((s) => this.toSectionDto(s));
  }

  /**
   * Retrieves a single section by ID.
   * Enforces ownership validation through the Project relation.
   */
  async findOne(userId: string, sectionId: string): Promise<SectionResponseDto> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section || section.project.userId !== userId) {
      throw new NotFoundException(`Section with identifier '${sectionId}' not found`);
    }

    return this.toSectionDto(section);
  }

  /**
   * Updates section attributes.
   * Enforces ownership validation through the Project relation.
   */
  async update(
    userId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ): Promise<SectionResponseDto> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section || section.project.userId !== userId) {
      throw new NotFoundException(`Section with identifier '${sectionId}' not found`);
    }

    const updated = await this.prisma.section.update({
      where: { id: sectionId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });

    return this.toSectionDto(updated);
  }

  /**
   * Deletes a section.
   * Tasks within this section have their section_id set to null automatically.
   */
  async remove(userId: string, sectionId: string): Promise<{ message: string }> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { project: true },
    });

    if (!section || section.project.userId !== userId) {
      throw new NotFoundException(`Section with identifier '${sectionId}' not found`);
    }

    await this.prisma.section.delete({
      where: { id: sectionId },
    });

    return { message: 'Section deleted successfully' };
  }

  private toSectionDto(section: any): SectionResponseDto {
    return {
      id: section.id,
      projectId: section.projectId,
      name: section.name,
      order: section.order,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };
  }
}
