import { IsString, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString() firstname: string;
  @IsString() lastname: string;

  // Adresse EVM 0x... (40 hex)
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'adresse must be a valid 0x-address' })
  adresse: string;
}
