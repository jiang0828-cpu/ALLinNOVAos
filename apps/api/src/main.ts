import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix so all routes live under /api
  app.setGlobalPrefix('api');

  // Enable CORS for all frontend dev origins
  app.enableCors({
    origin: [
      'http://localhost:3004',
      'http://127.0.0.1:3004',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  });

  // DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Swagger docs at /api/docs
  const config = new DocumentBuilder()
    .setTitle('NOVA OS API')
    .setDescription('Personal Command System API based on PDCAr methodology')
    .setVersion('1.0.0')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  logger.log(`NOVA OS API running on http://localhost:${port}/api`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
