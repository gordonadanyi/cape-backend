import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = new DocumentBuilder()
    .setTitle('Invoice Automation API')
    .setDescription(
      'API documentation for authentication, invoice management, payment links, and user settings.',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste the JWT access token returned from login or signup.',
    })
    .addTag('auth', 'Signup, login, and password management')
    .addTag('invoices', 'Upload, review, send, and manage invoices')
    .addTag('settings', 'Authenticated user settings')
    .addTag('payments', 'Paystack payment initialization and verification')
    .build();

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(","),
    credentials: true,
  });

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(configService.get<string>('PORT') ?? 3000);
  console.log(` Cape API running`);
}
bootstrap().catch((err) => {
  console.error('Error during application bootstrap', err);
});
