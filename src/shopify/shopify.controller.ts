import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators';
import { GetShopifyAuthUrlDto, GetShopifyProductByIdDto } from './dto';
import { ShopifyService } from './shopify.service';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserDoc } from 'src/database/schema';

@ApiBearerAuth()
@Controller('api/shopify')
export class ShopifyController {
  constructor(private shopifyService: ShopifyService) {}

  @Post('/auth/url')
  async getConnectionUrl(
    @GetUser() user: UserDoc,
    @Body() dto: GetShopifyAuthUrlDto,
  ) {
    const url = await this.shopifyService.getShopifyAccountConnectionUrl(
      user._id,
      dto.shop,
    );
    return { url };
  }

  @ApiQuery({ name: 'first', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  @Get('/products')
  async getProducts(
    @GetUser() user: UserDoc,
    @Query('first', new DefaultValuePipe(10), ParseIntPipe) first: number,
    @Query('after') after: string,
  ) {
    const response = await this.shopifyService.getShopifyProducts(user._id, {
      first,
      after,
    });

    return response;
  }

  @Post('/products/product-by-id')
  async getProductsById(
    @GetUser() user: UserDoc,
    @Body() dto: GetShopifyProductByIdDto,
  ) {
    const response = await this.shopifyService.getShopifyProductById(
      user._id,
      dto.productId,
    );

    return response;
  }
}
