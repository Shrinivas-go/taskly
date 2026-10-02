import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.setTimeout(30000);

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-uuid-1234',
    email: 'test@example.com',
    passwordHash: '$2b$12$e8w.p4Bv48xQ1dE.K3M...fakehash',
    authProvider: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user and return an auth response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
      expect(result.user.email).toBe(mockUser.email);
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            authProvider: 'local',
          }),
        }),
      );
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should ensure password is cryptographically hashed with bcrypt and not plaintext', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      let capturedHash = '';
      mockPrismaService.user.create.mockImplementation((args) => {
        capturedHash = args.data.passwordHash;
        return Promise.resolve({ ...mockUser, passwordHash: capturedHash });
      });

      await service.register({
        email: 'newuser@example.com',
        password: 'PlainTextPassword1',
      });

      expect(capturedHash).not.toBe('PlainTextPassword1');
      expect(capturedHash.startsWith('$2b$12$')).toBe(true);
      const isMatch = await bcrypt.compare('PlainTextPassword1', capturedHash);
      expect(isMatch).toBe(true);
    });
  });

  describe('login', () => {
    it('should successfully authenticate and return token for valid credentials', async () => {
      const realHash = await bcrypt.hash('ValidPass123', 12);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: realHash,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'ValidPass123',
      });

      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const realHash = await bcrypt.hash('CorrectPass123', 12);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: realHash,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not found without leaking existence', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateOAuthUser', () => {
    it('should authenticate existing OAuth user without re-creating', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateOAuthUser('test@example.com', 'google');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create a new user with google authProvider when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        authProvider: 'google',
      });

      const result = await service.validateOAuthUser('newuser@example.com', 'google');

      expect(result).toHaveProperty('user');
      expect(result.user.authProvider).toBe('google');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });
  });
});
