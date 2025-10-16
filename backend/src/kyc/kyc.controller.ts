// backend/src/kyc/kyc.controller.ts
import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import type { Address } from 'viem'
import { parseAbi } from 'viem'
import { publicClient, maybeAdminWallet, ADDR } from '../viem'
import { AdminGuard } from '../auth/admin.guard'

// Séparation des ABI pour éviter l’union ambiguë lecture/écriture
const KYC_GET_ABI = parseAbi([
  'function getStatus(address user) view returns (uint8)',
])

const KYC_SET_ABI = parseAbi([
  'function setStatus(address user, uint8 status)',
])

class SetKycStatusDto {
  address!: Address
  status!: number // 0..255 (0=None, 1=Whitelisted, 2=Blacklisted)
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

  @UseGuards(AdminGuard)
  @Post('set')
  async set(@Body() dto: SetKycStatusDto) {
    if (!maybeAdminWallet) {
      return { ok: false, reason: 'Server has no PRIVATE_KEY configured' }
    }
    if (!Number.isInteger(dto.status) || dto.status < 0 || dto.status > 255) {
      throw new BadRequestException('status must be an integer between 0 and 255')
    }

    // viem (dans ta config) attend un number pour uint8 → on envoie number, sans any
    const txHash = await maybeAdminWallet.writeContract({
      address: ADDR.KYC,
      abi: KYC_SET_ABI,
      functionName: 'setStatus',
      args: [dto.address, dto.status],
    })

    return { ok: true, txHash }
  }
}
