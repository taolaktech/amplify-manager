import { IsNotEmpty, Min } from 'class-validator';

export class CampaignToUpDto {
  @IsNotEmpty({
    message: 'Amount field must contain a value',
  })
  @Min(1, {
    message: 'Amount must be greater than or equal to 1',
  })
  amount: number;
}
