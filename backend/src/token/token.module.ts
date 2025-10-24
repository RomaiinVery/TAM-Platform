import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TokenController } from './token.controller'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [TokenController],
})
export class TokenModule {}
