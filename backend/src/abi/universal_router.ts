// ABI Universal Router — execute(bytes commands, bytes[] inputs, uint256 deadline)
import { Address, Hex, encodeAbiParameters, encodeFunctionData, concatHex, padHex, toHex } from 'viem'

export const UR_ABI = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

// Encode path V3: tokenIn (20B) | fee (3B) | tokenOut (20B)
export function encodeV3PathSingleHop(tokenIn: Address, feePpm: number, tokenOut: Address): Hex {
  if (feePpm < 0 || feePpm > 1_000_000) throw new Error('feePpm invalide')
  const fee3Bytes = padHex(toHex(feePpm), { size: 3 }) // 3 octets (uint24)
  return concatHex([tokenIn, fee3Bytes, tokenOut])
}

// arrondi “down” safe pour bigint*ratio
export function mulDivDown(x: bigint, num: bigint, den: bigint): bigint {
  return (x * num) / den
}