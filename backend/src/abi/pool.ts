import type { Address } from 'viem'
import { parseAbi } from 'viem'
import { publicClient } from '../viem'

export type PoolState = {
  sqrtPriceX96: bigint
  tick: number
  liquidity: bigint
  token0: Address
  token1: Address
  feePpm: number
}

const POOL_ABI = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)',
  'function liquidity() view returns (uint128)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
])

const ERC20_ABI = parseAbi([
  'function decimals() view returns (uint8)',
])

export async function fetchPoolState(pool: Address): Promise<PoolState> {
  const [slot0, liq, t0, t1, fee] = await Promise.all([
    publicClient.readContract({
      address: pool,
      abi: POOL_ABI,
      functionName: 'slot0',
    }) as Promise<
      readonly [bigint, number, number, number, number, number, boolean]
    >,
    publicClient.readContract({
      address: pool,
      abi: POOL_ABI,
      functionName: 'liquidity',
    }) as Promise<bigint>,
    publicClient.readContract({
      address: pool,
      abi: POOL_ABI,
      functionName: 'token0',
    }) as Promise<Address>,
    publicClient.readContract({
      address: pool,
      abi: POOL_ABI,
      functionName: 'token1',
    }) as Promise<Address>,
    publicClient.readContract({
      address: pool,
      abi: POOL_ABI,
      functionName: 'fee',
    }) as Promise<number>,
  ])

  const [sqrtPriceX96, tick] = slot0

  return {
    sqrtPriceX96,
    tick,
    liquidity: liq,
    token0: t0,
    token1: t1,
    feePpm: fee,
  }
}

export async function erc20Decimals(token: Address): Promise<number> {
  const d = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })
  return d as number
}

export function midPricesFromSqrtPrice(sqrtPriceX96: bigint): {
  midPriceToken1PerToken0: number
  midPriceToken0PerToken1: number
} {
  const Q96 = 2n ** 96n
  const priceNum = sqrtPriceX96 * sqrtPriceX96
  const priceDen = Q96 * Q96
  const p = Number(priceNum) / Number(priceDen)
  return {
    midPriceToken1PerToken0: p,
    midPriceToken0PerToken1: p === 0 ? Infinity : 1 / p,
  }
}
