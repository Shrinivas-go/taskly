import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SectionResponseDto } from './dto/section-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Sections')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post('projects/:projectId/sections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new section within a project' })
  @ApiParam({ name: 'projectId', description: 'Parent Project UUID' })
  @ApiResponse({
    status: 201,
    description: 'Section created successfully',
    type: SectionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found or owned by another user' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateSectionDto,
  ): Promise<SectionResponseDto> {
    return this.sectionsService.create(user.id, projectId, dto);
  }

  @Get('projects/:projectId/sections')
  @ApiOperation({ summary: 'List all sections for a given project' })
  @ApiParam({ name: 'projectId', description: 'Parent Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of sections in the project',
    type: [SectionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found or owned by another user' })
  findAllByProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<SectionResponseDto[]> {
    return this.sectionsService.findAllByProject(user.id, projectId);
  }

  @Get('sections/:id')
  @ApiOperation({ summary: 'Retrieve an individual section by ID' })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({
    status: 200,
    description: 'Section retrieved successfully',
    type: SectionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Section not found or owned by another user' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SectionResponseDto> {
    return this.sectionsService.findOne(user.id, id);
  }

  @Patch('sections/:id')
  @ApiOperation({ summary: 'Update section name or ordering position' })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({
    status: 200,
    description: 'Section updated successfully',
    type: SectionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Section not found or owned by another user' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<SectionResponseDto> {
    return this.sectionsService.update(user.id, id, dto);
  }

  @Delete('sections/:id')
  @ApiOperation({ summary: 'Delete a section (tasks are moved to unsectioned)' })
  @ApiParam({ name: 'id', description: 'Section UUID' })
  @ApiResponse({
    status: 200,
    description: 'Section deleted successfully',
    schema: { example: { message: 'Section deleted successfully' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Section not found or owned by another user' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.sectionsService.remove(user.id, id);
  }
}
