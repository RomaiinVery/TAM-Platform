import { Module } from '@nestjs/common'
import { DexController } from './dex.controller'

@Module({ controllers: [DexController] })
export class DexModule {}
