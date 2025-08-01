import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
  @ApiQuery({ name: 'last', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  @Get('/products')
  async getProducts(
    @GetUser() user: UserDoc,
    @Query('first') first: number,
    @Query('after') after: string,
    @Query('last') last: number,
    @Query('before') before: string,
  ) {
    const response = await this.shopifyService.getShopifyProducts(user._id, {
      first,
      after,
      last,
      before,
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

  @Get('/connected-account')
  async getConnectShopifyAccount(@GetUser() user: UserDoc) {
    const account = await this.shopifyService.getConnectedAccount(user._id);
    return { account };
  }
}
