import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
dotenv.config({ path: 'D:/myProjects/fitlo.ir/fitlo-backend/.env' });
console.log('Loaded Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ? 'defined' : 'undefined',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ? 'defined' : 'undefined',
  MINIO_BUCKET: process.env.MINIO_BUCKET,
});
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
 
  // Enable CORS
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Fitlo API')
    .setDescription('The Fitlo API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
