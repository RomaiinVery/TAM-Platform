import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.enableShutdownHooks();

  app.useGlobalPipes(
  new ValidationPipe({
      whitelist: true,           // supprime les champs inconnus
      forbidNonWhitelisted: false, // 400 si champs non attendus
      transform: true,            // transforme les types (ex: string -> number)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 4000;

  await app.listen(port);
  console.log(`Backend up on http://localhost:${port}`);
}
bootstrap();
