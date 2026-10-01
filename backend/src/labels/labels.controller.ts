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
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelResponseDto } from './dto/label-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Labels')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new label for the authenticated user' })
  @ApiResponse({
    status: 201,
    description: 'Label created successfully',
    type: LabelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Label name already exists for user' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLabelDto,
  ): Promise<LabelResponseDto> {
    return this.labelsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all labels owned by the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of user labels',
    type: [LabelResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<LabelResponseDto[]> {
    return this.labelsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve an individual label by ID' })
  @ApiParam({ name: 'id', description: 'Label UUID' })
  @ApiResponse({
    status: 200,
    description: 'Label retrieved successfully',
    type: LabelResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Label not found or owned by another user' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LabelResponseDto> {
    return this.labelsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update label name or color' })
  @ApiParam({ name: 'id', description: 'Label UUID' })
  @ApiResponse({
    status: 200,
    description: 'Label updated successfully',
    type: LabelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Label not found or owned by another user' })
  @ApiResponse({ status: 409, description: 'Label name conflict' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLabelDto,
  ): Promise<LabelResponseDto> {
    return this.labelsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a label' })
  @ApiParam({ name: 'id', description: 'Label UUID' })
  @ApiResponse({
    status: 200,
    description: 'Label deleted successfully',
    schema: { example: { message: 'Label deleted successfully' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Label not found or owned by another user' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.labelsService.remove(user.id, id);
  }
}
