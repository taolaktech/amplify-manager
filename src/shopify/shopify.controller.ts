import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser, Public } from 'src/auth/decorators';
import { GetShopifyProductByIdDto, SaveShopifyAccountDto } from './dto';
import { ShopifyService } from './shopify.service';
import { IntegrationsGaurd } from 'src/auth/integrations.guard';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserDoc } from 'src/database/schema';

@ApiBearerAuth()
@Controller('api/shopify')
export class ShopifyController {
  constructor(private shopifyService: ShopifyService) {}

  @Public()
  @UseGuards(IntegrationsGaurd)
  @Post('/save-account')
  async saveShopifyAccount(@Body() dto: SaveShopifyAccountDto) {
    const account = await this.shopifyService.saveShopifyAccount(dto);
    return { account };
  }

  @Get('/auth/url/:shop')
  async getConnectionUrl(
    @GetUser() user: UserDoc,
    @Param('shop') shop: string,
  ) {
    const url = await this.shopifyService.getShopifyAccountConnectionUrl(
      user._id,
      shop,
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
