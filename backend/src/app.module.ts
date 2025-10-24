import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { KycModule } from './kyc/kyc.module'
import { DexModule } from './dex/dex.module'
import { TokenModule } from './token/token.module'
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AssetsModule } from './assets/assets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env']
    }),
    PrismaModule,
    UsersModule,
    AssetsModule,
    KycModule,
    DexModule,
    TokenModule
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
