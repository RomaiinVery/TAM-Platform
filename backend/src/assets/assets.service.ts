import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { MarkMintedDto } from './dto/mark-minted.dto';


@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAssetDto) {
    return this.prisma.asset.create({
        data: {
        ownerAdresse: dto.ownerAdresse,
        kind: dto.kind,
        title: dto.title,
        description: dto.description,
        amountWei: dto.amountWei ?? null,
        metadataUrl: dto.metadataUrl ?? null,
        status: 'draft',
        },
    });
  }

  async markMinted(id: number, dto: MarkMintedDto) {
    return this.prisma.asset.update({
        where: { id },
        data: {
        txHash: dto.txHash,
        tokenAddress: dto.tokenAddress,
        chainId: dto.chainId,
        kycAtMint: dto.kycAtMint ?? null,
        status: 'minted',
        },
    });
  }

  listByOwner(owner: string) {
    return this.prisma.asset.findMany({
      where: { ownerAdresse: owner },
      orderBy: { createdAt: 'desc' },
    });
  }
}
