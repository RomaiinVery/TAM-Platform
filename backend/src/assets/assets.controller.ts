import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { MarkMintedDto } from './dto/mark-minted.dto';

@Controller('assets')
export class AssetsController {
  constructor(private svc: AssetsService) {}

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.svc.create(dto);
  }

  @Patch(':id/mint')
  minted(@Param('id') id: string, @Body() dto: MarkMintedDto) {
    return this.svc.markMinted(Number(id), dto);
  }

  @Get()
  listByOwner(@Query('owner') owner: string) {
    return this.svc.listByOwner(owner);
  }
}
