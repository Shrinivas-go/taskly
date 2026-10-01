import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthResponse = {
    user: {
      id: 'usr-1',
      email: 'user@test.com',
      authProvider: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    accessToken: 'jwt-token-abc',
  };

  const mockAuthService = {
    register: jest.fn().mockResolvedValue(mockAuthResponse),
    login: jest.fn().mockResolvedValue(mockAuthResponse),
    getProfile: jest.fn().mockResolvedValue(mockAuthResponse.user),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate register to AuthService', async () => {
    const dto = { email: 'user@test.com', password: 'Password123' };
    const result = await controller.register(dto);
    expect(result).toBe(mockAuthResponse);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('should delegate login to AuthService', async () => {
    const dto = { email: 'user@test.com', password: 'Password123' };
    const result = await controller.login(dto);
    expect(result).toBe(mockAuthResponse);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
  });

  it('should delegate getProfile to AuthService with authenticated user id', async () => {
    const result = await controller.getProfile({ id: 'usr-1', email: 'user@test.com' });
    expect(result).toBe(mockAuthResponse.user);
    expect(mockAuthService.getProfile).toHaveBeenCalledWith('usr-1');
  });

  it('should return logout success message', async () => {
    const result = await controller.logout();
    expect(result).toEqual({ message: 'Successfully logged out' });
  });
});
