import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientSecret || clientSecret === 'dummy_secret_set_in_env') {
      this.logger.warn('Google OAuth requested but GOOGLE_CLIENT_SECRET is not configured');
      const response = context.switchToHttp().getResponse();
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',')[0].trim() : '') ||
        (process.env.NODE_ENV === 'production'
          ? 'https://taskly-frontend.onrender.com'
          : 'http://localhost:3000');

      if (response && typeof response.redirect === 'function') {
        return response.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
      }

      throw new HttpException(
        'Google OAuth is not configured yet. Please set GOOGLE_CLIENT_SECRET in backend environment variables.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return super.canActivate(context);
  }
}
