import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication, _apiPrefix?: string): void {
  const config = new DocumentBuilder()
    .setTitle('MatabAI (ShifaDesk) Core API')
    .setDescription(
      'Multilingual AI-Powered Clinic Operations SaaS Platform API Specification',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT bearer token',
        in: 'header',
      },
      'bearer-jwt',
    )
    .addTag('Health', 'Operational health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'MatabAI API Documentation',
  });
}
