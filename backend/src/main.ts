import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Controller()
class HealthController {
  @Get('/status')
  status() {
    return { ok: true, service: 'backend', ts: Date.now() };
  }
}

@Module({
  imports: [
    // charge .env et expose ConfigService partout
    ConfigModule.forRoot({ isGlobal: true })
  ],
  controllers: [HealthController]
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;

  await app.listen(port);
  console.log(`Backend up on http://localhost:${port}`);
}
bootstrap();
