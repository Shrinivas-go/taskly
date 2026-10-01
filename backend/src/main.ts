import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix matching System Design Section 10.1
  app.setGlobalPrefix('api/v1');

  // Strict input validation pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Production-safe CORS configuration with environment-driven origins
  const corsEnv = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  const allowedOrigins = corsEnv
    ? corsEnv.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, same-origin, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  // OpenAPI / Swagger Documentation accessible at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Todoist-Style Application API')
    .setDescription('REST API for Todoist task management - Phase 5 Implementation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || process.env.BACKEND_PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend server running on http://localhost:${port}/api/v1`);
  console.log(`OpenAPI documentation running on http://localhost:${port}/api/docs`);
}

bootstrap();
