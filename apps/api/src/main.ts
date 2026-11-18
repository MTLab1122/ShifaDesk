import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  // Request Payload Limits (DoS mitigation)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Production CORS Configuration
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-tenant-id',
      'X-Correlation-ID',
      'X-Request-ID',
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
  });

  // Global API Prefix: /api/v1
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  const normalizedPrefix = apiPrefix.startsWith('/')
    ? apiPrefix.slice(1)
    : apiPrefix;
  app.setGlobalPrefix(normalizedPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Sliding-Window Rate Limiting Guard
  app.useGlobalGuards(new RateLimitGuard());

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Logging Interceptor with Correlation ID Tracking
  app.useGlobalInterceptors(new LoggingInterceptor());

  // OpenAPI Swagger Documentation
  setupSwagger(app, normalizedPrefix);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`MatabAI Core API running on port ${port} with prefix /${normalizedPrefix}`);
  logger.log(`API Documentation available at http://localhost:${port}/api/docs`);
  logger.log(`Health Check endpoint: http://localhost:${port}/${normalizedPrefix}/health`);
  logger.log(`Liveness probe: http://localhost:${port}/${normalizedPrefix}/health/live`);
  logger.log(`Readiness probe: http://localhost:${port}/${normalizedPrefix}/health/ready`);

  // Handle SIGTERM & SIGINT for zero-downtime graceful shutdown
  const shutdownTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000;
  const handleShutdown = async (signal: string) => {
    logger.log(`${signal} received: draining active connections and shutting down...`);
    const timer = setTimeout(() => {
      logger.error('Forced shutdown timeout reached. Terminating process.');
      process.exit(1);
    }, shutdownTimeout);
    timer.unref();

    try {
      await app.close();
      logger.log('MatabAI API terminated gracefully.');
      process.exit(0);
    } catch (err: any) {
      logger.error(`Error during shutdown: ${err?.message}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap();
