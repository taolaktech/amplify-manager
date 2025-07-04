import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShopifyAccountDoc } from 'src/database/schema';
import { ShopifyAccountStatus } from 'src/enums/shopify-account-status';
import axios, { AxiosError } from 'axios';
import { AppConfigService } from 'src/config/config.service';
import { ErrorCode } from 'src/enums';

@Injectable()
export class ShopifyService {
  constructor(
    private configService: AppConfigService,
    @InjectModel('shopify-accounts')
    private shopifyAccountModel: Model<ShopifyAccountDoc>,
  ) {}

  private integrationsAxiosInstance() {
    const axiosInstance = axios.create({
      baseURL: `${this.configService.get('INTEGRATION_API_URL')}/api/shopify`,
      headers: {
        'x-api-key': this.configService.get('INTEGRATION_API_KEY'),
      },
    });

    return axiosInstance;
  }

  private async getShopifyConnectionUrlCall(userId: string, shop: string) {
    try {
      const res = await this.integrationsAxiosInstance().post<{ url: string }>(
        '/auth/url',
        {
          shop,
          userId,
        },
      );
      return res.data.url;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.log(error.response);
        console.log(error.response?.data);
      }
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  private async getProductsCall(
    params: {
      shop: string;
      accessToken: string;
      scope: string;
    },
    query?: { first?: number; after?: string },
  ) {
    try {
      const first = query?.first ?? 10;
      const after = query?.after ?? '';
      const url1 = `/products?first=${first}&after=${after}`;

      const axios = this.integrationsAxiosInstance();

      const res = await axios.post<{
        products: { [key: string]: any };
        shop: { [key: string]: any };
      }>(url1, {
        shop: params.shop,
        accessToken: params.accessToken,
        scope: params.scope,
      });
      return res.data;
    } catch (error: unknown) {
      console.log(error);
      if (error instanceof AxiosError) {
        console.log(error.response);
        throw new BadRequestException(error.response?.data);
      }
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  private async getProductByIdCall(params: {
    shop: string;
    accessToken: string;
    scope: string;
    productId: string;
  }) {
    try {
      const url = `/products/product-by-id`;

      const res = await this.integrationsAxiosInstance().post<{
        product: { [key: string]: any };
        shop: { [key: string]: any };
      }>(url, params);
      return res.data;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.log(error.response);
        throw new BadRequestException(error.response?.data);
      }
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getShopifyProducts(userId: Types.ObjectId, query: any) {
    const shopifyAccount = await this.shopifyAccountModel.findOne({
      belongsTo: userId,
      accountStatus: ShopifyAccountStatus.CONNECTED,
    });

    if (!shopifyAccount) {
      throw new BadRequestException(ErrorCode.SHOPIFY_ACCOUNT_NOT_FOUND);
    }

    const productsRes = await this.getProductsCall(
      {
        shop: shopifyAccount.shop,
        accessToken: shopifyAccount.accessToken,
        scope: shopifyAccount.scope,
      },
      query,
    );

    return productsRes;
  }

  async getShopifyAccountConnectionUrl(userId: Types.ObjectId, shop: string) {
    const shopifyAccountAlreadyExists = await this.shopifyAccountModel.findOne({
      belongsTo: userId,
      accountStatus: ShopifyAccountStatus.CONNECTED,
    });

    if (shopifyAccountAlreadyExists) {
      throw new BadRequestException(ErrorCode.SHOPIFY_ACCOUNT_ALREADY_EXISTS);
    }

    const url = await this.getShopifyConnectionUrlCall(userId.toString(), shop);

    return url;
  }

  async getShopifyProductById(userId: Types.ObjectId, productId: string) {
    const shopifyAccount = await this.shopifyAccountModel.findOne({
      belongsTo: userId,
      accountStatus: ShopifyAccountStatus.CONNECTED,
    });

    if (!shopifyAccount) {
      throw new BadRequestException(ErrorCode.SHOPIFY_ACCOUNT_NOT_FOUND);
    }

    const productRes = await this.getProductByIdCall({
      shop: shopifyAccount.shop,
      accessToken: shopifyAccount.accessToken,
      scope: shopifyAccount.scope,
      productId,
    });

    return productRes;
  }

  async getConnectedAccount(userId: Types.ObjectId) {
    const account = await this.shopifyAccountModel.findOne({
      belongsTo: userId,
      accountStatus: ShopifyAccountStatus.CONNECTED,
    });
    // const acc = { };
    return account
      ? { ...account.toObject(), accessToken: undefined, scope: undefined }
      : null;
  }
}
