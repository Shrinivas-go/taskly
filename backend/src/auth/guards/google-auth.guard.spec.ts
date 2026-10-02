import { ExecutionContext, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './google-auth.guard';

describe('GoogleAuthGuard', () => {
  let guard: GoogleAuthGuard;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    guard = new GoogleAuthGuard(configService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should redirect or throw if GOOGLE_CLIENT_SECRET is missing or dummy', () => {
    jest.spyOn(configService, 'get').mockReturnValue('dummy_secret_set_in_env');

    const mockResponse = { redirect: jest.fn() };
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    guard.canActivate(mockContext);

    expect(mockResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?error=oauth_not_configured'),
    );
  });

  it('should throw HttpException if response object does not support redirect', () => {
    jest.spyOn(configService, 'get').mockReturnValue(undefined);

    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(HttpException);
  });
});
