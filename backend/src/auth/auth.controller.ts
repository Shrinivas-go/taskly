import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account with email and password' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully and authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed (invalid email or weak password)' })
  @ApiResponse({ status: 409, description: 'An account with this email address already exists' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials and issue access token' })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payload structure' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 authentication flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth consent screen' })
  async googleAuth() {
    // Handled by GoogleAuthGuard which delegates to passport-google-oauth20
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback redirect endpoint' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with access token' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const authResponse = (req as any).user as AuthResponseDto;
    const frontendUrl =
      process.env.FRONTEND_URL ||
      (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',')[0].trim() : '') ||
      (process.env.NODE_ENV === 'production'
        ? 'https://taskly-frontend.onrender.com'
        : 'http://localhost:3000');

    if (!authResponse || !authResponse.accessToken) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    return res.redirect(
      `${frontendUrl}/auth/callback?token=${encodeURIComponent(authResponse.accessToken)}`,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user profile',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfileDto> {
    return this.authService.getProfile(user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Terminate authenticated user session' })
  @ApiResponse({
    status: 200,
    description: 'Session terminated successfully',
    schema: { example: { message: 'Successfully logged out' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout() {
    return { message: 'Successfully logged out' };
  }
}
