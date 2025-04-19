// {
//   accessToken: 'string',
//   scope: 'read_products,read_orders',
//   userId: 'string',
//   shop: 'akinola-stor.myshopify.com'
// }

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveShopifyAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scope: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shop: string;
}

export class GetShopifyProductByIdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;
}
