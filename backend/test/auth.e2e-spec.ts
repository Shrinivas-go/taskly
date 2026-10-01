import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  const testUser = {
    email: 'engineer@todoist.dev',
    password: 'Password123',
  };

  let token = '';

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.message).toContain('already exists');
    });

    it('should reject invalid email format with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email-address',
          password: 'Password123',
        })
        .expect(400);
    });

    it('should reject weak password (< 8 chars or no numbers) with 400 Bad Request', async () => {
      // Too short
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'shortpass@todoist.dev',
          password: 'Pass1',
        })
        .expect(400);

      // No numbers
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'nonumbers@todoist.dev',
          password: 'PasswordWithoutNumbers',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate valid credentials and issue JWT (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(testUser)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe(testUser.email);
      token = res.body.accessToken;
    });

    it('should reject incorrect password with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'IncorrectPassword999',
        })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject unknown email with 401 Unauthorized without leaking existence', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nobody@nowhere.com',
          password: 'Password123',
        })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return authenticated user profile with valid Bearer token (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe(testUser.email);
      expect(res.body).toHaveProperty('id');
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should terminate session when authenticated (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({ message: 'Successfully logged out' });
    });
  });
});
