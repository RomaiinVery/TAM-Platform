// backend/src/kyc/kyc.controller.ts
import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import type { Address } from 'viem'
import { parseAbi } from 'viem'
import { publicClient, maybeAdminWallet, ADDR } from '../viem'
import { AdminGuard } from '../auth/admin.guard'
import { IsInt, Min, Max, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

// Séparation des ABI pour éviter l’union ambiguë lecture/écriture
const KYC_GET_ABI = parseAbi([
  'function getStatus(address user) view returns (uint8)',
])

const KYC_SET_ABI = parseAbi([
  'function setStatus(address user, uint8 status)',
])

class SetKycDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'address must be a valid EVM address' })
  address!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(255) // ton contrat prend un uint8
  status!: number;
}

@Controller('kyc')
export class KycController {
  @Get(':addr')
  async getStatus(@Param('addr') addr: string) {
    // viem retourne un bigint pour uint8 en lecture
    const raw = await publicClient.readContract({
      address: ADDR.KYC,
      abi: KYC_GET_ABI,
      functionName: 'getStatus',
      args: [addr as Address],
    })
    return { address: addr, status: Number(raw) } // JSON sûr
  }

  @Post('set')
  @UseGuards(AdminGuard)
  async set(@Body() dto: SetKycDto) {
    if (!Number.isInteger(dto.status) || dto.status < 0 || dto.status > 255) {
      throw new BadRequestException('status must be an integer between 0 and 255');
    }
    const txHash = await maybeAdminWallet?.writeContract({
      address: ADDR.KYC,
      abi: KYC_SET_ABI,
      functionName: 'setStatus',
      args: [dto.address as Address, dto.status],
    });
    return { ok: true, txHash };
  }
}
