import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID =
      configService.get<string>('GOOGLE_CLIENT_ID') ||
      '110254728311-acfug1luj2l7m68l3katijarqtmb01mu.apps.googleusercontent.com';

    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') ||
      'dummy_secret_set_in_env';

    const baseUrl =
      configService.get<string>('RENDER_EXTERNAL_URL') ||
      configService.get<string>('BACKEND_URL') ||
      (process.env.NODE_ENV === 'production'
        ? 'https://taskly-backend-rsdd.onrender.com'
        : 'http://localhost:4000');

    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      `${baseUrl.replace(/\/$/, '')}/api/v1/auth/google/callback`;

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    this.logger.log(`Google OAuth Strategy initialized with callback URL: ${callbackURL}`);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      this.logger.error('Google OAuth profile did not contain an email address');
      return done(new Error('No email found in Google OAuth profile'), false);
    }

    try {
      const authResponse = await this.authService.validateOAuthUser(email, 'google');
      done(null, authResponse);
    } catch (err) {
      this.logger.error(`OAuth validation failed for email ${email}: ${err}`);
      done(err as Error, false);
    }
  }
}
