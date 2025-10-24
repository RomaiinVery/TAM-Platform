import { IsIn, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'ownerAdresse doit être une adresse EVM valide' })
  ownerAdresse!: string;

  @IsIn(['erc20', 'erc721'], { message: 'kind doit être "erc20" ou "erc721"' })
  kind!: 'erc20' | 'erc721';

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(8000)
  description!: string;

  // Pour erc20 uniquement (wei sous forme string décimale)
  @IsOptional()
  @Matches(/^\d+$/, { message: 'amountWei doit être un entier positif (string)' })
  amountWei?: string;

  // Pour erc721 uniquement
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'metadataUrl doit être une URL http(s) valide' })
  metadataUrl?: string;
}
