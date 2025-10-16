// Uniswap V3 QuoterV2: quoteExactInputSingle
export const QUOTER_V2_ABI = [
    {
      type: 'function',
      name: 'quoteExactInputSingle',
      stateMutability: 'nonpayable',
      inputs: [
        {
          components: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'sqrtPriceLimitX96', type: 'uint160' },
          ],
          name: 'params',
          type: 'tuple',
        },
      ],
      outputs: [
        { name: 'amountOut', type: 'uint256' },
        { name: 'sqrtPriceX96After', type: 'uint160' },
        { name: 'initializedTicksCrossed', type: 'uint32' },
        { name: 'gasEstimate', type: 'uint256' },
      ],
    },
  ] as const
  