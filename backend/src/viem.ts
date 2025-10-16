// backend/src/viem.ts
import 'dotenv/config';
import { createPublicClient, createWalletClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import type { Address, Hex, PublicClient, WalletClient, Transport, Account } from 'viem'

function env(name: string): string {
  const v = process.env[name]
  if (!v || v.trim() === '') {
    throw new Error(`[ENV] Manque ${name} dans backend/.env`)
  }
  return v
}
function envAddress(name: string): Address {
  return env(name) as Address
}

// On exporte la chaîne pour la réutiliser (optionnel mais pratique)
export const CHAIN = sepolia

// ✅ Annotation générique compacte qui garde la chaîne dans le type
export const publicClient: PublicClient<Transport, typeof CHAIN> = createPublicClient({
  chain: CHAIN,
  transport: http(process.env.ALCHEMY_RPC_URL!),
})

// ✅ Annotation générique compacte + chain conservée → `writeContract` n’exigera pas `chain`
export const maybeAdminWallet: WalletClient<Transport, typeof CHAIN, Account> | null =
  process.env.PRIVATE_KEY
    ? createWalletClient({
        chain: CHAIN,
        transport: http(process.env.ALCHEMY_RPC_URL!),
        account: privateKeyToAccount(process.env.PRIVATE_KEY as Hex),
      })
    : null

export const ADDR = {
  KYC: envAddress('KYC_REGISTRY'),
  RWA: envAddress('RWA_ERC20'),
  WETH: envAddress('WETH'),
  UR:  envAddress('UNIVERSAL_ROUTER'),
  QUOTER_V2: envAddress('QUOTER_V2'),
  POOL: envAddress('POOL'),
} as const
