import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetShopifyProductByIdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;
}

export class GetShopifyAuthUrlDto {
  @ApiProperty({
    description: 'myshopifyDomain of the store',
    example: '(https://)akinola-stor.myshopify.com',
  })
  @IsString()
  @IsNotEmpty()
  shop: string;

  @ApiProperty({
    description: 'the route to redirect to after successful authentication',
    example: '/setup?linked=true',
  })
  @IsString()
  @IsOptional()
  redirect?: string;
}
