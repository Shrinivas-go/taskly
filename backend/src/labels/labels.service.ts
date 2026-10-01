import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelResponseDto } from './dto/label-response.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new label owned by the authenticated user.
   * Ensures label name uniqueness per user.
   */
  async create(userId: string, dto: CreateLabelDto): Promise<LabelResponseDto> {
    const trimmedName = dto.name.trim();

    const existing = await this.prisma.label.findUnique({
      where: {
        userId_name: {
          userId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`A label with name '${trimmedName}' already exists`);
    }

    const label = await this.prisma.label.create({
      data: {
        userId,
        name: trimmedName,
        color: dto.color ?? null,
      },
    });

    return this.toLabelDto(label);
  }

  /**
   * Retrieves all labels owned by the authenticated user.
   */
  async findAll(userId: string): Promise<LabelResponseDto[]> {
    const labels = await this.prisma.label.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    return labels.map((l) => this.toLabelDto(l));
  }

  /**
   * Retrieves a single label by ID for the authenticated user.
   */
  async findOne(userId: string, labelId: string): Promise<LabelResponseDto> {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!label || label.userId !== userId) {
      throw new NotFoundException(`Label with identifier '${labelId}' not found`);
    }

    return this.toLabelDto(label);
  }

  /**
   * Updates a label owned by the authenticated user.
   */
  async update(
    userId: string,
    labelId: string,
    dto: UpdateLabelDto,
  ): Promise<LabelResponseDto> {
    const existing = await this.prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException(`Label with identifier '${labelId}' not found`);
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName !== existing.name) {
        const duplicate = await this.prisma.label.findFirst({
          where: {
            userId,
            name: trimmedName,
            NOT: { id: labelId },
          },
        });

        if (duplicate) {
          throw new ConflictException(
            `A label with name '${trimmedName}' already exists`,
          );
        }
      }
    }

    const updated = await this.prisma.label.update({
      where: { id: labelId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });

    return this.toLabelDto(updated);
  }

  /**
   * Deletes a label owned by the authenticated user.
   * Cascades deletion to task_labels join entries.
   */
  async remove(userId: string, labelId: string): Promise<{ message: string }> {
    const existing = await this.prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException(`Label with identifier '${labelId}' not found`);
    }

    await this.prisma.label.delete({
      where: { id: labelId },
    });

    return { message: 'Label deleted successfully' };
  }

  private toLabelDto(label: any): LabelResponseDto {
    return {
      id: label.id,
      userId: label.userId,
      name: label.name,
      color: label.color,
      createdAt: label.createdAt,
      updatedAt: label.updatedAt,
    };
  }
}
