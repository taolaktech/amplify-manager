// {
//   accessToken: 'string',
//   scope: 'read_products,read_orders',
//   userId: 'string',
//   shop: 'akinola-stor.myshopify.com'
// }

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetShopifyProductByIdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;
}

export class GetShopifyAuthUrlDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shop: string;
}
