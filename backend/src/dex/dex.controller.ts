import { Body, Controller, Get, Post, Query, HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common'
import type { Address, Hex } from 'viem'
import { encodeAbiParameters, parseAbiParameters, encodeFunctionData } from 'viem'
import { publicClient, ADDR } from '../viem'
import { QUOTER_V2_ABI } from '../abi/quoterV2'
import { fetchPoolState, erc20Decimals, midPricesFromSqrtPrice } from '../abi/pool'
import { UR_ABI, encodeV3PathSingleHop, mulDivDown } from '../abi/universal_router'

function isAddress(x: string): x is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(x)
}

/** Division de bigints → number, avec un scale décimal pour éviter les surflows/arrondis trop tôt. */
function divBigintToNumber(n: bigint, d: bigint, scale = 12): number {
  // renvoie ~ Number(n / d) mais en conservant de la précision (12 décimales par défaut)
  const SCALE = 10n ** BigInt(scale);
  // (n / d) ≈ (n * SCALE) / d, puis on remet l’échelle côté number
  return Number((n * SCALE) / d) / 10 ** scale;
}

// 0x00 = V3_SWAP_EXACT_IN
const V3_SWAP_EXACT_IN: Hex = '0x00'
const FEE = Number(process.env.FEE ?? 3000)

// DTO d’entrée
type SwapCalldataDto = {
  sender: Address;            // wallet qui signera et paiera tokenIn
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;           // en wei (string -> bigint)
  pool: Address;              // pool RWA/WETH
  slippageBps?: number;       // default 50 bps (0.50%)
  recipient?: Address;        // défaut = sender
  deadlineSec?: number;       // défaut = maintenant+10min
}

@Controller('dex')
export class DexController {
  @Get('quote')
  async quote(
    @Query('tokenIn') tokenIn: Address,
    @Query('tokenOut') tokenOut: Address,
    @Query('amountIn') amountIn: string,
  ) {
    console.log(ADDR.QUOTER_V2);
    console.log(tokenIn);
    console.log(tokenOut);
    // 1) on lit la quote
    const result = await publicClient.readContract({
      address: ADDR.QUOTER_V2,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      args: [{
        tokenIn,
        tokenOut,
        fee: FEE,
        amountIn: BigInt(amountIn),
        sqrtPriceLimitX96: 0n,
      }],
    })

    // 2) on **annote explicitement** le tuple pour éviter `never` et permettre .toString()
    const [amountOut, sqrtAfter, ticksCrossed, gasEst] =
      result as readonly [bigint, bigint, number, bigint]

    // 3) JSON sûr : bigint -> string
    return {
      amountOut: amountOut.toString(),
      sqrtAfter: sqrtAfter.toString(),
      ticksCrossed: Number(ticksCrossed),
      gasEst: gasEst.toString(),
    }
  }

  @Get('quote-spot')
  async quoteSpot(
    @Query('pool') pool: string,
    @Query('tokenIn') tokenInQ: string,
    @Query('tokenOut') tokenOutQ: string,
    @Query('amountIn') amountInQ: string,
  ) {
    // 1) Validations d’entrée (400)
    if (!isAddress(pool)) {
      throw new HttpException(
        { ok: false, reason: 'Paramètre "pool" invalide' },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (!isAddress(tokenInQ) || !isAddress(tokenOutQ)) {
      throw new HttpException(
        { ok: false, reason: 'tokenIn/tokenOut invalides' },
        HttpStatus.BAD_REQUEST,
      )
    }
    if (!amountInQ || !/^\d+$/.test(amountInQ)) {
      throw new HttpException(
        { ok: false, reason: 'amountIn manquant ou invalide' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const amountIn = BigInt(amountInQ)
    if (amountIn <= 0n) {
      throw new HttpException(
        { ok: false, reason: 'amountIn doit être > 0' },
        HttpStatus.BAD_REQUEST,
      )
    }

    // 2) Lecture pool (503 si RPC/contrat down)
    let state
    try {
      state = await fetchPoolState(pool as Address)
    } catch {
      throw new HttpException(
        { ok: false, reason: 'slot0() échoue ou RPC indisponible' },
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    const { token0, token1, feePpm, sqrtPriceX96, tick, liquidity } = state

    // 3) Sanity pair tokens (404 si le pool n’est pas celui attendu)
    const tokenIn = tokenInQ as Address
    const tokenOut = tokenOutQ as Address

    // Le pool doit correspondre exactement à la paire {token0, token1} (ordre quelconque)
    const pairMatches =
      (tokenIn === token0 && tokenOut === token1) ||
      (tokenIn === token1 && tokenOut === token0)

    if (!pairMatches) {
      throw new HttpException(
        {
          ok: false,
          reason:
            'Le pool fourni ne correspond pas à (tokenIn, tokenOut) — vérifie la paire et le fee tier',
        },
        HttpStatus.NOT_FOUND,
      )
    }

    // 4) Décimales (400 si un token ne répond pas correctement)
    let decimalsIn: number, decimalsOut: number
    try {
      decimalsIn = await erc20Decimals(tokenIn)
      decimalsOut = await erc20Decimals(tokenOut)
    } catch {
      throw new HttpException(
        {
          ok: false,
          reason: 'Impossible de lire decimals() sur tokenIn/tokenOut',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    // 5) Mid-prices “spot”
    const { midPriceToken1PerToken0, midPriceToken0PerToken1 } =
      midPricesFromSqrtPrice(sqrtPriceX96)

    // 6) Quote “spot” locale (même logique que ta version précédente)
    //    - si tokenIn === token0 : out ≈ amountIn * P * (1 - fee)
    //    - sinon : out ≈ amountIn / P * (1 - fee)
    //    P = midPriceToken1PerToken0
    const feeFactor = 1 - feePpm / 1_000_000
    let amountOut: bigint

    if (tokenIn === token0 && tokenOut === token1) {
      // token0 -> token1
      const outFloat =
        Number(amountIn) * midPriceToken1PerToken0 * feeFactor
      amountOut = BigInt(Math.floor(outFloat))
    } else {
      // token1 -> token0
      const outFloat =
        Number(amountIn) * midPriceToken0PerToken1 * feeFactor
      amountOut = BigInt(Math.floor(outFloat))
    }

    // 7) Limites connues / avertissements (200 + warning)
    const warnings: string[] = []
    if (liquidity === 0n) {
      warnings.push('Pool sans liquidité — quote indicative')
    }
    // conversion float → BigInt = approximation : on le signale
    // warnings.push('Quote spot approximative')

    // 8) Réponse OK
    return {
      ok: true,
      pool,
      feePpm,
      sqrtPriceX96: sqrtPriceX96.toString(),
      tick,
      liquidity: liquidity.toString(),
      token0,
      token1,
      tokenInIsToken0: tokenIn === token0,
      decimalsIn,
      decimalsOut,
      amountIn: amountIn.toString(),
      amountOut: amountOut.toString(),
      midPriceToken1PerToken0: Number(midPriceToken1PerToken0.toFixed(12)),
      midPriceToken0PerToken1: Number(midPriceToken0PerToken1.toFixed(12)),
      warnings,
    }
  }

  @Post('swap-calldata')
  async swapCalldata(@Body() dto: SwapCalldataDto) {
    // 1) Validation inputs de base
    const { sender, tokenIn, tokenOut, pool } = dto
    if (!sender || !tokenIn || !tokenOut || !pool) {
      throw new BadRequestException('sender, tokenIn, tokenOut, pool requis')
    }
    let amountIn: bigint
    try {
      amountIn = BigInt(dto.amountIn)
    } catch {
      throw new BadRequestException('amountIn invalide (attendu string wei)')
    }
    if (amountIn <= 0n) throw new BadRequestException('amountIn doit être > 0')

    const slippageBps = dto.slippageBps ?? 50  // 0.50% par défaut
    if (slippageBps < 0 || slippageBps > 10_000) {
      throw new BadRequestException('slippageBps invalide (0..10000)')
    }
    const recipient: Address = (dto.recipient ?? sender) as Address
    const deadline = BigInt(dto.deadlineSec ?? Math.floor(Date.now()/1000) + 600)
    const now = Math.floor(Date.now() / 1000);
    const deadlineAbs = BigInt(now + (dto.deadlineSec ?? 900));

    // 2) Lecture du pool (votre helper existant)
    const state = await fetchPoolState(pool)
    // state: { feePpm, token0, token1, sqrtPriceX96, ... }

    // vérif cohérence tokenIn/tokenOut vs pool
    const direct = (state.token0.toLowerCase() === tokenIn.toLowerCase() &&
                    state.token1.toLowerCase() === tokenOut.toLowerCase())
    const inverse = (state.token1.toLowerCase() === tokenIn.toLowerCase() &&
                    state.token0.toLowerCase() === tokenOut.toLowerCase())
    if (!direct && !inverse) {
      throw new NotFoundException('Le pool fourni ne correspond pas à (tokenIn, tokenOut)')
    }

    // 3) Calcule amountOutMin à partir du midprice spot (approche conservative)
    // midPrice token1/token0 = (sqrtPriceX96^2) / Q192
    const Q96  = 2n ** 96n
    const Q192 = Q96 * Q96
    const priceX128 = (state.sqrtPriceX96 * state.sqrtPriceX96) // Q192
    // Attention au sens:
    //  - si tokenIn === token0, amountOut ≈ amountIn * (token1/token0)
    //  - si tokenIn === token1, amountOut ≈ amountIn * (token0/token1) = amountIn * Q192 / priceX128
    let amountOutEst: bigint
    if (direct) {
      amountOutEst = mulDivDown(amountIn, priceX128, Q192)
    } else {
      amountOutEst = mulDivDown(amountIn, Q192, priceX128)
    }

    // retire fees du pool (ex: 3000 ppm = 0.3%) puis la slippage
    const feePpm = state.feePpm
    if (feePpm < 0 || feePpm > 1_000_000) {
      throw new BadRequestException('feePpm invalide renvoyé par le pool')
    }
    // netFee = (1 - feePpm/1e6)
    amountOutEst = mulDivDown(amountOutEst, BigInt(1_000_000 - feePpm), 1_000_000n)
    // slippage = (1 - slippageBps/1e4)
    const amountOutMin = mulDivDown(amountOutEst, BigInt(10_000 - slippageBps), 10_000n)

    if (amountOutMin <= 0n) {
      throw new BadRequestException('amountOutMin <= 0 — montant trop petit ou pool inactif')
    }

    // 4) Construction du path V3 (single hop)
    const path = encodeV3PathSingleHop(tokenIn, feePpm, tokenOut)

    // 5) Construction des "commands" + "inputs" pour UR.execute(...)
    //    Une seule commande: V3 exact input
    const commands: Hex = V3_SWAP_EXACT_IN

    // input encodé: (recipient, amountIn, amountOutMin, path, payerIsUser)
    const inputBytes: Hex = encodeAbiParameters(
      [
        { type: 'address' },  // recipient
        { type: 'uint256' },  // amountIn
        { type: 'uint256' },  // amountOutMin
        { type: 'bytes'   },  // path
        { type: 'bool'    },  // payerIsUser
      ],
      [recipient, amountIn, amountOutMin, path, true]
    )

    const inputs: Hex[] = [inputBytes]

    // 6) Calldata final d’UR.execute
    const data: Hex = encodeFunctionData({
      abi: UR_ABI,
      functionName: 'execute',
      args: [commands, inputs, deadlineAbs]
    })

    // 7) On renvoie l’objet “tx request” prêt à signer côté dApp
    //    NOTE: approve(tokenIn -> UR) doit se faire côté dApp avant l’envoi.
    return {
      ok: true,
      router: ADDR.UR,
      chainId: 11155111,   // sepolia
      to: ADDR.UR,
      data,
      value: '0',          // ERC20->ERC20, pas de value
      deadline: deadline.toString(),
      // infos utiles pour debug / affichage:
      feePpm,
      amountIn: amountIn.toString(),
      amountOutMin: amountOutMin.toString(),
      path,
      notes: [],
    }
  }
}
