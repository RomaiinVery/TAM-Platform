import { IsInt, IsIn } from 'class-validator';

export class UpdateKycDto {
  @IsInt()
  @IsIn([0, 1, 2], { message: 'kyc must be 0, 1 or 2' })
  kyc: number;
}
