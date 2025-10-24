import { IsInt, IsOptional, IsString, Matches, Min, Max } from 'class-validator';

export class MarkMintedDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'txHash invalide' })
  txHash!: string;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'tokenAddress invalide' })
  tokenAddress!: string;

  @IsInt()
  @Min(1)
  chainId!: number;

  // 0: unverified, 1: verified, 2: blocked
  @IsOptional()
  @IsInt({ message: 'kycAtMint doit être un entier' })
  @Min(0, { message: 'kycAtMint doit être 0, 1 ou 2' })
  @Max(2, { message: 'kycAtMint doit être 0, 1 ou 2' })
  kycAtMint?: number;
}
