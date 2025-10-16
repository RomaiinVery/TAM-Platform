export const KYC_ABI = [
    { type: 'function', name: 'getStatus', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint8' }] },
    { type: 'function', name: 'setStatus', stateMutability: 'nonpayable', inputs: [{ name: 'user', type: 'address' }, { name: 'status', type: 'uint8' }], outputs: [] },
  ] as const
  