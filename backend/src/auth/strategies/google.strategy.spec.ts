import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let mockAuthService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'mock-client-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'mock-client-secret';
        if (key === 'GOOGLE_CALLBACK_URL') return 'https://taskly-backend-rsdd.onrender.com/api/v1/auth/google/callback';
        return undefined;
      }),
    };

    mockAuthService = {
      validateOAuthUser: jest.fn().mockResolvedValue({
        user: { id: 'usr-1', email: 'test@example.com', authProvider: 'google' },
        accessToken: 'mock-access-token',
      }),
    };

    strategy = new GoogleStrategy(
      mockConfigService as ConfigService,
      mockAuthService as AuthService,
    );
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate profile and return authResponse', async () => {
    const mockProfile: any = {
      id: 'google-id-123',
      displayName: 'Test User',
      profileUrl: 'https://profiles.google.com/test',
      emails: [{ value: 'test@example.com', verified: 'true' }],
      photos: [],
      provider: 'google',
      _raw: '',
      _json: {},
    };

    const done = jest.fn();

    await strategy.validate('mock-token', 'mock-refresh', mockProfile, done);

    expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith('test@example.com', 'google');
    expect(done).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ accessToken: 'mock-access-token' }),
    );
  });

  it('should call done with error if profile has no email', async () => {
    const mockProfile: any = {
      id: 'google-id-123',
      displayName: 'Test User',
      profileUrl: 'https://profiles.google.com/test',
      emails: [],
      photos: [],
      provider: 'google',
      _raw: '',
      _json: {},
    };

    const done = jest.fn();

    await strategy.validate('mock-token', 'mock-refresh', mockProfile, done);

    expect(done).toHaveBeenCalledWith(expect.any(Error), false);
  });
});
