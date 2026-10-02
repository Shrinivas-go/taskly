import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  // Salt rounds codified in Phase 4 System Design Section 8.1
  private readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user with email and password.
   * Enforces uniqueness and hashes password with bcrypt (12 rounds).
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Verify duplicate account constraint (FR-AUTH-001)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists',
      );
    }

    // Cryptographic one-way hashing with per-user salt
    const passwordHash = await bcrypt.hash(
      dto.password,
      this.BCRYPT_SALT_ROUNDS,
    );

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        authProvider: 'local',
      },
    });

    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: this.toUserProfile(user),
      accessToken,
    };
  }

  /**
   * Authenticates user credentials.
   * Protects against account enumeration by returning generic 401 error.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: this.toUserProfile(user),
      accessToken,
    };
  }

  /**
   * Retrieves profile for the currently authenticated user.
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserProfile(user);
  }

  /**
   * Validates or creates a user authenticated via OAuth (e.g. Google).
   * Generates and returns JWT access token and user profile.
   */
  async validateOAuthUser(
    email: string,
    authProvider: string = 'google',
  ): Promise<AuthResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const dummyPassword = randomUUID();
      const passwordHash = await bcrypt.hash(
        dummyPassword,
        this.BCRYPT_SALT_ROUNDS,
      );

      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          authProvider,
        },
      });
    }

    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: this.toUserProfile(user),
      accessToken,
    };
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }

  private toUserProfile(user: {
    id: string;
    email: string;
    authProvider: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
