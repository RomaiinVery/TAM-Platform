import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common'
import { Address, createPublicClient, createWalletClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { ERC20_MIN_ABI } from '../abi/erc20'
import { ConfigService } from '@nestjs/config'

type MintErc20Dto = {
  to: string
  amount: string            // en wei (string)
  token?: string            // optionnel, sinon on prend process.env.RWA_ERC20
}

@Controller('token')
export class TokenController {
  constructor(private readonly config: ConfigService) {}

  @Post('mint-erc20')
  async mintErc20(@Body() body: MintErc20Dto) {
    const { to, amount, token } = body || {}

    if (!to || !amount) {
      throw new HttpException(
        { ok: false, reason: 'Paramètres manquants: "to", "amount"' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const PRIVATE_KEY = this.config.get<string>('PRIVATE_KEY') || "0x6bbc8acf3f09b957f22437cd3cfab87a1395f7990568654b84e9e1727575811c"
    const RWA_ERC20 = (token || this.config.get<string>('RWA_ERC20')) as Address
    const RPC = this.config.get<string>('ALCHEMY_RPC_URL') || 'https://sepolia.drpc.org'

    console.log(PRIVATE_KEY)
    console.log(RWA_ERC20)
    console.log(RPC)

    if (!PRIVATE_KEY) {
      throw new HttpException(
        { ok: false, reason: 'PRIVATE_KEY manquant dans .env' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
    if (!RWA_ERC20) {
      throw new HttpException(
        { ok: false, reason: 'Adresse du token ERC20 manquante (RWA_ERC20)' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    // Clients viem “rapides”
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
    const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
    const walletClient = createWalletClient({ chain: sepolia, transport: http(RPC), account })

    // Normalisation des types
    let amountBn: bigint
    try {
      amountBn = BigInt(amount)
    } catch {
      throw new HttpException(
        { ok: false, reason: '"amount" invalide (doit être un string numérique en wei)' },
        HttpStatus.BAD_REQUEST,
      )
    }

    try {
      // 1) on envoie la tx mint
      const hash = await walletClient.writeContract({
        address: RWA_ERC20,
        abi: ERC20_MIN_ABI,
        functionName: 'mint',
        args: [to as Address, amountBn],
        account,
      })

      // 2) on attend le receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      return {
        ok: true,
        token: RWA_ERC20,
        to,
        amount,
        txHash: hash,
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString(),
      }
    } catch (err: any) {
      // retour d’erreur lisible (vite fait)
      throw new HttpException(
        {
          ok: false,
          reason: 'mint reverted ou RPC indisponible',
          error: err?.shortMessage || err?.message || String(err),
        },
        HttpStatus.BAD_GATEWAY,
      )
    }
  }
}
